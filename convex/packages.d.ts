export declare const submitPackage: import("convex/server").RegisteredMutation<"public", {
    version?: string | undefined;
    name: string;
}, Promise<import("convex/values").GenericId<"packages">>>;
export declare const getPackage: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"packages">;
}, Promise<{
    _id: import("convex/values").GenericId<"packages">;
    _creationTime: number;
    description?: string | undefined;
    registry_data?: any;
    tarball_url?: string | undefined;
    name: string;
    version: string;
    analysis_status: string;
    created_at: number;
    updated_at: number;
} | null>>;
export declare const listPackages: import("convex/server").RegisteredQuery<"public", {
    status?: string | undefined;
    limit?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"packages">;
    _creationTime: number;
    description?: string | undefined;
    registry_data?: any;
    tarball_url?: string | undefined;
    name: string;
    version: string;
    analysis_status: string;
    created_at: number;
    updated_at: number;
}[]>>;
export declare const updatePackageStatus: import("convex/server").RegisteredMutation<"public", {
    registry_data?: any;
    id: import("convex/values").GenericId<"packages">;
    status: string;
}, Promise<void>>;
//# sourceMappingURL=packages.d.ts.map