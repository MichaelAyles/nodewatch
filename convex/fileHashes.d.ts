export declare const storeFileHash: import("convex/server").RegisteredMutation<"public", {
    encoding?: string | undefined;
    analysis_results?: any;
    content_hash: string;
    file_path: string;
    size: number;
    lines: number;
    is_text: boolean;
}, Promise<import("convex/values").GenericId<"file_hashes">>>;
export declare const linkPackageFile: import("convex/server").RegisteredMutation<"public", {
    file_path: string;
    package_id: import("convex/values").GenericId<"packages">;
    file_hash_id: import("convex/values").GenericId<"file_hashes">;
    is_duplicate: boolean;
}, Promise<import("convex/values").GenericId<"package_files">>>;
export declare const getFileHashByContent: import("convex/server").RegisteredQuery<"public", {
    content_hash: string;
}, Promise<{
    _id: import("convex/values").GenericId<"file_hashes">;
    _creationTime: number;
    encoding?: string | undefined;
    analysis_results?: any;
    content_hash: string;
    created_at: number;
    file_path: string;
    size: number;
    lines: number;
    is_text: boolean;
    first_seen: number;
    last_seen: number;
    package_count: number;
} | null>>;
export declare const getPackageFiles: import("convex/server").RegisteredQuery<"public", {
    package_id: import("convex/values").GenericId<"packages">;
}, Promise<any[]>>;
export declare const getMostDuplicatedFiles: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"file_hashes">;
    _creationTime: number;
    encoding?: string | undefined;
    analysis_results?: any;
    content_hash: string;
    created_at: number;
    file_path: string;
    size: number;
    lines: number;
    is_text: boolean;
    first_seen: number;
    last_seen: number;
    package_count: number;
}[]>>;
export declare const getFileHashStats: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    totalFiles: number;
    duplicatedFiles: number;
    deduplicationRate: number;
    totalSize: number;
    duplicatedSize: number;
    spaceSavingRate: number;
    textFiles: number;
    binaryFiles: number;
    avgFileSize: number;
}>>;
export declare const cleanupOldFileHashes: import("convex/server").RegisteredMutation<"public", {
    min_package_count?: number | undefined;
    older_than_days: number;
}, Promise<{
    deletedCount: number;
}>>;
//# sourceMappingURL=fileHashes.d.ts.map