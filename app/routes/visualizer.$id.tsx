import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from "react-router";
import puter from "@heyputer/puter.js";

const VisualizerId = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const { initialImage: stateImage, name: stateName } = (location.state as { initialImage?: string; name?: string } | null) || {};

    const [storedProject, setStoredProject] = useState<{ sourceImage?: string; name?: string } | null>(null);

    useEffect(() => {
        if (!stateImage && id) {
            const loadProject = async () => {
                try {
                    const stored = await puter.kv.get(id);
                    if (stored) {
                        if (typeof stored === 'string') {
                            try {
                                setStoredProject(JSON.parse(stored));
                            } catch {
                                setStoredProject({ sourceImage: stored });
                            }
                        } else if (typeof stored === 'object') {
                            setStoredProject(stored as { sourceImage?: string; name?: string });
                        }
                    }
                } catch (error) {
                    console.error("Failed to load project:", error);
                }
            };

            loadProject();
        }
    }, [id, stateImage]);

    const initialImage = stateImage || storedProject?.sourceImage;
    const name = stateName || storedProject?.name;

    return (
        <section>
            <h1>{name || 'Untitled Project'}</h1>
            <div className="visualizer">
                {initialImage && (
                    <div className="image-container">
                        <h2>Source Image</h2>
                        <img src={initialImage} alt="Source" />
                    </div>
                )}
            </div>
        </section>
    );
};

export default VisualizerId;