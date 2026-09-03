import type {Route} from "./+types/home";
import Navbar from "../../components/Navbar";
import {ArrowRight, ArrowUpRight, Clock, Layers} from "lucide-react";
import Button from "../../components/ui/Button";
import Upload from "../../components/Upload";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";
import {createProject, getProjects} from "../../lib/puter.action";

export function meta({}: Route.MetaArgs) {
    return [
        {title: "New React Router App"},
        {name: "description", content: "Welcome to React Router!"},
    ];
}

export default function Home() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<DesignItem[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadKey, setUploadKey] = useState(0);
    const [loadingProjects, setLoadingProjects] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchProjects = async () => {
            try {
                const data = await getProjects();
                if (isMounted) {
                    setProjects(data);
                }
            } catch (error) {
                console.error("Failed to load projects:", error);
            } finally {
                if (isMounted) {
                    setLoadingProjects(false);
                }
            }
        };

        fetchProjects();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleUploadComplete = async (base64Image: string) => {
        try {
            setUploadError(null);
            const newId = Date.now().toString();
            const name = `Residence ${newId}`;
            const newItem: DesignItem = {
                id: newId,
                name,
                sourceImage: base64Image,
                renderedImage: undefined,
                timestamp: Date.now()
            };
            const saved = await createProject({item: newItem, visibility: 'private'});
            if (!saved) {
                console.error('Failed to create project');
                setUploadError('Failed to create project. Please try again.');
                setUploadKey(prev => prev + 1);
                return;
            }
            setProjects(prev => [newItem, ...prev]);

            navigate(`/visualizer/${newId}`, {
                state: {
                    initialImage: saved.sourceImage,
                    initialRender: saved.renderedImage,
                    name
                }
            });
        } catch (error) {
            console.error('Failed to create project', error);
            setUploadError('Failed to create project. Please try again.');
            setUploadKey(prev => prev + 1);
        }
    }
    return (
        <div className="home">
            <Navbar/>
            <section className="hero">
                <div className="announce">
                    <div className="dot">
                        <div className="pulse"></div>
                    </div>
                    <p>Introducing Roomify 2.0</p>
                </div>
                <h1>Build beautiful spaces at the speed of thought with Roomify</h1>
                <p className="subtitle">Roomify is an AI-first design environment
                    that helps you visualize, render and ship architectural projects
                    faster than ever.</p>
                <div className="actions">
                    <a href="#upload" className="cta">
                        Start building <ArrowRight className="icon"/>
                    </a>
                    <Button variant="outline" size="lg" className="demo"> Watch demo</Button>
                </div>
                <div id="upload" className="upload-shell">
                    <div className="grid-overlay"/>
                    <div className="upload-card">
                        <div className="upload-head">
                            <div className="upload-icon">
                                <Layers className="icon"/>
                            </div>
                            <h3>Upload your floor plan</h3>
                            <p>Supports JPG, PNG, formats up to 10MB</p>
                            {uploadError && (
                                <p className="text-red-500 text-sm mt-2">{uploadError}</p>
                            )}
                        </div>
                        <Upload key={uploadKey} onComplete={handleUploadComplete}/>
                    </div>
                </div>
            </section>
            <section className="projects">
                <div className="section-inner">
                    <div className="section-head">
                        <div className="copy">
                            <h2>Projects</h2>
                            <p>Your latest work and shared community projects, all in one place.</p>
                        </div>
                    </div>
                    {loadingProjects && (
                        <div className="loading">
                            <p>Loading projects...</p>
                        </div>
                    )}
                    <div className="projects-grid">
                        {!loadingProjects && projects.length === 0 && (
                            <div className="empty">
                                <p>No projects yet. Upload a floor plan to get started!</p>
                            </div>
                        )}
                        {projects.map(({id, name, renderedImage, sourceImage, timestamp, isPublic, sharedBy, ownerId}) => {
                            const owner = sharedBy || ownerId;
                            return (
                                <Link
                                    key={id}
                                    to={`/visualizer/${id}`}
                                    state={{
                                        initialImage: sourceImage,
                                        initialRender: renderedImage,
                                        name
                                    }}
                                    className="project-card group"
                                >
                                    <div className="preview">
                                        <img
                                            src={renderedImage || sourceImage} alt={"Project"} />
                                        {isPublic && (
                                            <div className="badge">
                                                <span>Community</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-body">
                                        <div>
                                            <h3>{name}</h3>
                                            <div className="meta">
                                                <Clock size={12}/>
                                                <span>{new Date(timestamp).toLocaleDateString()}</span>
                                                {owner && <span>By {owner}</span>}
                                            </div>
                                        </div>
                                        <div className="arrow">
                                            <ArrowUpRight size={18}/>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    )
}
