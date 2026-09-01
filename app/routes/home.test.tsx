// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {createRoutesStub, Outlet, useParams} from "react-router";

import {PROGRESS_INTERVAL_MS, REDIRECT_DELAY_MS} from "../../lib/constants";
import Home from "./home";

class SuccessfulFileReader {
    result: string | ArrayBuffer | null = null;
    onloadend: ((event: ProgressEvent<FileReader>) => void) | null = null;

    readAsDataURL(file: File) {
        this.result = `data:${file.type};base64,dGVzdA==`;
        this.onloadend?.(new ProgressEvent("loadend") as ProgressEvent<FileReader>);
    }
}

function VisualizerProbe() {
    const {id} = useParams();
    return <h1>Visualizer {id}</h1>;
}

describe("Home upload flow", () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("navigates to the visualizer route with the generated upload id", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-01T12:00:00.000Z"));
        vi.stubGlobal("FileReader", SuccessfulFileReader);

        const Root = () => (
            <Outlet
                context={{
                    isSignedIn: true,
                    userName: "Taylor",
                    userId: "user-1",
                    refreshAuth: vi.fn(),
                    signIn: vi.fn(),
                    signOut: vi.fn(),
                }}
            />
        );
        const Stub = createRoutesStub([
            {
                Component: Root,
                children: [
                    {index: true, Component: Home},
                    {path: "visualizer/:id", Component: VisualizerProbe},
                ],
            },
        ]);
        const {container} = render(<Stub />);
        const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;

        fireEvent.change(input, {
            target: {
                files: [new File(["plan"], "floor.png", {type: "image/png"})],
            },
        });
        act(() => vi.advanceTimersByTime(PROGRESS_INTERVAL_MS * 7));
        act(() => vi.advanceTimersByTime(REDIRECT_DELAY_MS));

        expect(
            screen.getByRole("heading", {name: `Visualizer ${Date.now()}`}),
        ).toBeInTheDocument();
    });
});
