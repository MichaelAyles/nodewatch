export declare const submitPackage: import("convex/server").RegisteredMutation<"public", {
    version?: string | undefined;
    registry_data?: any;
    content_hash?: string | undefined;
    package_hash?: string | undefined;
    file_count?: number | undefined;
    total_size?: number | undefined;
    unique_files?: number | undefined;
    duplicate_files?: string[] | undefined;
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
    download_count?: number | undefined;
    maintainer_info?: {
        email?: string | undefined;
        username: string;
        two_factor_auth: boolean;
        account_age: number;
    } | undefined;
    dependency_count?: number | undefined;
    typosquatting_score?: number | undefined;
    name: string;
    version: string;
    analysis_status: string;
    content_hash: string;
    package_hash: string;
    file_count: number;
    total_size: number;
    unique_files: number;
    duplicate_files: string[];
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
    download_count?: number | undefined;
    maintainer_info?: {
        email?: string | undefined;
        username: string;
        two_factor_auth: boolean;
        account_age: number;
    } | undefined;
    dependency_count?: number | undefined;
    typosquatting_score?: number | undefined;
    name: string;
    version: string;
    analysis_status: string;
    content_hash: string;
    package_hash: string;
    file_count: number;
    total_size: number;
    unique_files: number;
    duplicate_files: string[];
    created_at: number;
    updated_at: number;
}[]>>;
export declare const updatePackageStatus: import("convex/server").RegisteredMutation<"public", {
    registry_data?: any;
    id: import("convex/values").GenericId<"packages">;
    status: string;
}, Promise<void>>;
export declare const findPackageByContentHash: import("convex/server").RegisteredQuery<"public", {
    content_hash: string;
}, Promise<{
    _id: import("convex/values").GenericId<"packages">;
    _creationTime: number;
    description?: string | undefined;
    registry_data?: any;
    tarball_url?: string | undefined;
    download_count?: number | undefined;
    maintainer_info?: {
        email?: string | undefined;
        username: string;
        two_factor_auth: boolean;
        account_age: number;
    } | undefined;
    dependency_count?: number | undefined;
    typosquatting_score?: number | undefined;
    name: string;
    version: string;
    analysis_status: string;
    content_hash: string;
    package_hash: string;
    file_count: number;
    total_size: number;
    unique_files: number;
    duplicate_files: string[];
    created_at: number;
    updated_at: number;
} | null>>;
export declare const findPackagesByFileHash: import("convex/server").RegisteredQuery<"public", {
    file_hash: string;
}, Promise<{
    _id: import("convex/values").GenericId<"packages">;
    _creationTime: number;
    description?: string | undefined;
    registry_data?: any;
    tarball_url?: string | undefined;
    download_count?: number | undefined;
    maintainer_info?: {
        email?: string | undefined;
        username: string;
        two_factor_auth: boolean;
        account_age: number;
    } | undefined;
    dependency_count?: number | undefined;
    typosquatting_score?: number | undefined;
    name: string;
    version: string;
    analysis_status: string;
    content_hash: string;
    package_hash: string;
    file_count: number;
    total_size: number;
    unique_files: number;
    duplicate_files: string[];
    created_at: number;
    updated_at: number;
}[]>>;
export declare const getDeduplicationStats: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    totalPackages: number;
    totalUniqueFiles: number;
    duplicateFiles: number;
    totalDuplicateInstances: number;
    spaceSavedBytes: number;
    deduplicationRate: number;
}>>;
export declare const updatePackageHashes: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"packages">;
    content_hash: string;
    package_hash: string;
    file_count: number;
    total_size: number;
    unique_files: number;
    duplicate_files: string[];
}, Promise<void>>;
//# sourceMappingURL=packages.d.ts.map