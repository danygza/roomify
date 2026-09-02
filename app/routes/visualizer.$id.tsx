import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import puter from '@heyputer/puter.js';

const VisualizerId = () => {
    const { id } = useParams<{ id: string }>();
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchImage = async () => {
            if (!id) return;
            try {
                const data = await puter.kv.get(id);
                if (data) {
                    setImage(data as string);
                }
            } catch (error) {
                console.error("Failed to load image:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchImage();
    }, [id]);

    if (loading) {
        return <div className="visualizer-route loading">Loading...</div>;
    }

    return (
        <div className="visualizer-route">
            {image ? (
                <img src={image} alt="Visualizer" className="max-w-full max-h-screen object-contain" />
            ) : (
                <p>Image not found</p>
            )}
        </div>
    );
};

export default VisualizerId;