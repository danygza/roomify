// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import routes from "./routes";
import VisualizerId from "./routes/visualizer.$id";

describe("application routes", () => {
    afterEach(cleanup);

    it("registers the home page and dynamic visualizer page", () => {
        expect(routes).toHaveLength(2);
        expect(routes[0]).toEqual({file: "routes/home.tsx", index: true});
        expect(routes[1]).toEqual({
            file: "./routes/visualizer.$id.tsx",
            path: "visualizer/:id",
            children: undefined,
        });
    });

    it("renders the visualizer route placeholder", () => {
        render(<VisualizerId />);

        expect(screen.getByText("VisualizerId")).toBeInTheDocument();
    });
});
