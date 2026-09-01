// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createRoutesStub, Outlet} from "react-router";

import {
    PROGRESS_INTERVAL_MS,
    REDIRECT_DELAY_MS,
} from "../lib/constants";
import Upload from "./Upload";

type ReaderBehavior = "load" | "error";

let readerBehavior: ReaderBehavior;
let readerInstances: MockFileReader[];

class MockFileReader {
    result: string | ArrayBuffer | null = null;
    onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
    onloadend: ((event: ProgressEvent<FileReader>) => void) | null = null;

    constructor() {
        readerInstances.push(this);
    }

    readAsDataURL(file: File) {
        if (readerBehavior === "error") {
            this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
            return;
        }

        this.result = `data:${file.type};base64,dGVzdA==`;
        this.onloadend?.(new ProgressEvent("loadend") as ProgressEvent<FileReader>);
    }
}

function renderUpload({
    isSignedIn = true,
    onComplete,
}: {
    isSignedIn?: boolean;
    onComplete?: (base64Data: string) => void;
} = {}) {
    const Root = () => <Outlet context={{isSignedIn}} />;
    const Subject = () => <Upload onComplete={onComplete} />;
    const Stub = createRoutesStub([
        {
            Component: Root,
            children: [{index: true, Component: Subject}],
        },
    ]);

    return render(<Stub />);
}

function getFileInput(container: HTMLElement) {
    return container.querySelector<HTMLInputElement>('input[type="file"]')!;
}

function dropFile(container: HTMLElement, file: File) {
    fireEvent.drop(container.querySelector(".dropzone")!, {
        dataTransfer: {files: [file]},
    });
}

describe("Upload", () => {
    beforeEach(() => {
        readerBehavior = "load";
        readerInstances = [];
        vi.stubGlobal("FileReader", MockFileReader);
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("disables every upload path when the user is signed out", () => {
        const {container} = renderUpload({isSignedIn: false});
        const dropzone = container.querySelector(".dropzone")!;
        const input = getFileInput(container);
        const image = new File(["plan"], "floor.png", {type: "image/png"});

        expect(input).toBeDisabled();
        expect(screen.getByText("Sign in or sign up with Puter to upload")).toBeInTheDocument();

        fireEvent.dragOver(dropzone);
        expect(dropzone).not.toHaveClass("is-dragging");

        dropFile(container, image);
        fireEvent.change(input, {target: {files: [image]}});

        expect(readerInstances).toHaveLength(0);
        expect(container.querySelector(".upload-status")).not.toBeInTheDocument();
    });

    it("shows and clears drag feedback for a signed-in user", () => {
        const {container} = renderUpload();
        const dropzone = container.querySelector(".dropzone")!;

        fireEvent.dragOver(dropzone);
        expect(dropzone).toHaveClass("is-dragging");

        fireEvent.dragLeave(dropzone);
        expect(dropzone).not.toHaveClass("is-dragging");
    });

    it.each([
        ["JPEG", "image/jpeg", "floor.jpg"],
        ["PNG", "image/png", "floor.png"],
    ])("processes a dropped %s and completes only after progress and redirect delays", (
        _label,
        mimeType,
        fileName,
    ) => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const {container} = renderUpload({onComplete});
        const image = new File(["plan"], fileName, {type: mimeType});

        dropFile(container, image);

        expect(screen.getByRole("heading", {name: fileName})).toBeInTheDocument();
        expect(screen.getByText("Analyzing Floor Plan...")).toBeInTheDocument();
        expect(container.querySelector(".bar")).toHaveStyle({width: "0%"});
        expect(readerInstances).toHaveLength(1);

        act(() => vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 6));
        expect(container.querySelector(".bar")).toHaveStyle({width: "90%"});
        expect(onComplete).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(PROGRESS_INTERVAL_MS));
        expect(container.querySelector(".bar")).toHaveStyle({width: "100%"});
        expect(screen.getByText("Redirecting...")).toBeInTheDocument();
        expect(onComplete).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(REDIRECT_DELAY_MS - 1));
        expect(onComplete).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(1));
        expect(onComplete).toHaveBeenCalledOnce();
        expect(onComplete).toHaveBeenCalledWith(`data:${mimeType};base64,dGVzdA==`);
    });

    it("ignores an unsupported file dropped onto the upload area", () => {
        const onComplete = vi.fn();
        const {container} = renderUpload({onComplete});
        const webp = new File(["plan"], "floor.webp", {type: "image/webp"});

        dropFile(container, webp);

        expect(readerInstances).toHaveLength(0);
        expect(onComplete).not.toHaveBeenCalled();
        expect(container.querySelector(".dropzone")).toBeInTheDocument();
    });

    it("processes a file selected through the file input", () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const {container} = renderUpload({onComplete});
        const image = new File(["plan"], "selected.webp", {type: "image/webp"});

        fireEvent.change(getFileInput(container), {target: {files: [image]}});
        act(() => vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 7));
        act(() => vi.advanceTimersByTime(REDIRECT_DELAY_MS));

        expect(onComplete).toHaveBeenCalledWith("data:image/webp;base64,dGVzdA==");
    });

    it("returns to the dropzone when reading a file fails", () => {
        readerBehavior = "error";
        const onComplete = vi.fn();
        const {container} = renderUpload({onComplete});
        const image = new File(["plan"], "broken.png", {type: "image/png"});

        fireEvent.change(getFileInput(container), {target: {files: [image]}});

        expect(screen.getByText("Click to upload or just drag and drop")).toBeInTheDocument();
        expect(container.querySelector(".upload-status")).not.toBeInTheDocument();
        expect(onComplete).not.toHaveBeenCalled();
    });

    it("cancels in-progress analysis when unmounted", () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const {container, unmount} = renderUpload({onComplete});

        dropFile(container, new File(["plan"], "floor.png", {type: "image/png"}));
        act(() => vi.advanceTimersByTime(PROGRESS_INTERVAL_MS));
        unmount();
        act(() => vi.advanceTimersByTime(10_000));

        expect(onComplete).not.toHaveBeenCalled();
    });

    it("cancels a pending completion callback when unmounted", () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const {container, unmount} = renderUpload({onComplete});

        dropFile(container, new File(["plan"], "floor.png", {type: "image/png"}));
        act(() => vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 7));
        unmount();
        act(() => vi.advanceTimersByTime(REDIRECT_DELAY_MS));

        expect(onComplete).not.toHaveBeenCalled();
    });
});
