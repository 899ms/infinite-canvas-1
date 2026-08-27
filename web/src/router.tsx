import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";

import { AnalyticsTracker } from "@/components/layout/analytics-tracker";
import UserLayout from "@/layouts/user-layout";

const HomePage = lazy(() => import("@/pages/home"));
const ImagePage = lazy(() => import("@/pages/image"));
const VideoPage = lazy(() => import("@/pages/video"));
const InteriorDesignPage = lazy(() => import("@/pages/interior"));
const FrameFlowPage = lazy(() => import("@/pages/frameflow"));
const AssetsPage = lazy(() => import("@/pages/assets"));
const PromptsPage = lazy(() => import("@/pages/prompts"));
const CanvasPage = lazy(() => import("@/pages/canvas"));
const CanvasProjectPage = lazy(() => import("@/pages/canvas/project"));
const ConfigPage = lazy(() => import("@/pages/config"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoadingFallback() {
    return (
        <main className="h-full overflow-y-auto bg-background" aria-busy="true" aria-live="polite">
            <span className="sr-only">页面加载中…</span>
            <div className="mx-auto max-w-6xl space-y-6 px-6 py-8 motion-reduce:animate-none">
                <div className="h-8 w-52 animate-pulse rounded-md bg-muted" />
                <div className="h-5 w-80 max-w-full animate-pulse rounded-md bg-muted" />
                <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((index) => <div key={index} className="h-44 animate-pulse rounded-lg bg-muted" />)}
                </div>
            </div>
        </main>
    );
}

function lazyPage(Page: ComponentType) {
    return <Suspense fallback={<PageLoadingFallback />}><Page /></Suspense>;
}

export const router = createBrowserRouter([
    {
        element: (
            <UserLayout>
                <AnalyticsTracker />
                <Outlet />
            </UserLayout>
        ),
        children: [
            { path: "/", element: lazyPage(HomePage) },
            { path: "/image", element: lazyPage(ImagePage) },
            { path: "/video", element: lazyPage(VideoPage) },
            { path: "/interior", element: lazyPage(InteriorDesignPage) },
            { path: "/frameflow", element: lazyPage(FrameFlowPage) },
            { path: "/assets", element: lazyPage(AssetsPage) },
            { path: "/prompts", element: lazyPage(PromptsPage) },
            { path: "/canvas", element: lazyPage(CanvasPage) },
            { path: "/canvas/:id", element: lazyPage(CanvasProjectPage) },
            { path: "/config", element: lazyPage(ConfigPage) },
        ],
    },
    { path: "*", element: lazyPage(NotFound) },
]);
