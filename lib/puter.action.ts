import puter from "@heyputer/puter.js";
import {getOrCreateHostingConfig, uploadImageToHosting} from "./puter.hosting";
import {isHostedUrl} from "./utils";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

export const createProject = async ({item}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
    const projectId = item.id;
    const hosting = await getOrCreateHostingConfig();
    const hostedSource = projectId ?
        await uploadImageToHosting({
            hosting, url: item.sourceImage, projectId, label: 'source',
        }) : null;
    const hostedRender = projectId && item.renderedImage ?
        await uploadImageToHosting({
            hosting, url: item.renderedImage, projectId, label: 'rendered',
        }) : null;

    const resolvedSource = hostedSource?.url || (isHostedUrl(item.sourceImage) ?
    item.sourceImage : '');

    if(!resolvedSource){
        console.warn('Failed to host source image, skipping save.')
        return null;
    };

    const resolvedRender = hostedRender?.url
        ? hostedRender?.url
        : item.renderedImage && isHostedUrl(item.renderedImage)
            ? item.renderedImage
            : undefined;

    const {
        sourcePath: _sourcePath,
        renderedPath: _renderedPath,
        publicPath: _publicPath,
        ...rest
    } = item;

    const payload = {
        ...rest,
        sourceImage: resolvedSource,
        renderedImage: resolvedRender,
    }

    try {
        // Call the Puter worker to store project in kv
        await puter.kv.set(projectId, payload);
        return payload;
    } catch (e) {
        console.log('Failed to save project', e)
        return null;
    }
}

export const getProjects = async (): Promise<DesignItem[]> => {
    try {
        const items = (await puter.kv.list(true)) as { key: string; value: unknown }[];
        if (!items || !Array.isArray(items)) return [];
        return items
            .map((entry) => {
                let val = entry?.value !== undefined ? entry.value : entry;
                if (typeof val === 'string') {
                    try {
                        val = JSON.parse(val);
                    } catch {
                        return null;
                    }
                }
                return val as DesignItem;
            })
            .filter((p): p is DesignItem => Boolean(p && typeof p === 'object' && p.id && (p.sourceImage || p.renderedImage)))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
        console.error('Failed to get projects', e);
        return [];
    }
}