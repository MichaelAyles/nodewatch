declare const _default: import("convex/server").SchemaDefinition<{
    packages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        registry_data?: any;
        tarball_url?: string | undefined;
        name: string;
        version: string;
        analysis_status: string;
        created_at: number;
        updated_at: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        version: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        registry_data: import("convex/values").VAny<any, "optional", string>;
        tarball_url: import("convex/values").VString<string | undefined, "optional">;
        analysis_status: import("convex/values").VString<string, "required">;
        created_at: import("convex/values").VFloat64<number, "required">;
        updated_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "name" | "version" | "description" | "registry_data" | "tarball_url" | "analysis_status" | "created_at" | "updated_at" | `registry_data.${string}`>, {
        by_name: ["name", "_creationTime"];
        by_status: ["analysis_status", "_creationTime"];
    }, {}, {}>;
    analysis_results: import("convex/server").TableDefinition<import("convex/values").VObject<{
        results?: any;
        error?: string | undefined;
        started_at?: number | undefined;
        completed_at?: number | undefined;
        package_id: import("convex/values").GenericId<"packages">;
        stage: string;
        status: string;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        stage: import("convex/values").VString<string, "required">;
        status: import("convex/values").VString<string, "required">;
        results: import("convex/values").VAny<any, "optional", string>;
        error: import("convex/values").VString<string | undefined, "optional">;
        started_at: import("convex/values").VFloat64<number | undefined, "optional">;
        completed_at: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "package_id" | "stage" | "status" | "results" | "error" | "started_at" | "completed_at" | `results.${string}`>, {
        by_package: ["package_id", "_creationTime"];
        by_stage: ["stage", "_creationTime"];
    }, {}, {}>;
    risk_scores: import("convex/server").TableDefinition<import("convex/values").VObject<{
        static_score?: number | undefined;
        dynamic_score?: number | undefined;
        llm_score?: number | undefined;
        package_id: import("convex/values").GenericId<"packages">;
        overall_score: number;
        reasons: string[];
        calculated_at: number;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        overall_score: import("convex/values").VFloat64<number, "required">;
        static_score: import("convex/values").VFloat64<number | undefined, "optional">;
        dynamic_score: import("convex/values").VFloat64<number | undefined, "optional">;
        llm_score: import("convex/values").VFloat64<number | undefined, "optional">;
        reasons: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        calculated_at: import("convex/values").VFloat64<number, "required">;
    }, "required", "package_id" | "overall_score" | "static_score" | "dynamic_score" | "llm_score" | "reasons" | "calculated_at">, {
        by_package: ["package_id", "_creationTime"];
    }, {}, {}>;
    file_contents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        package_id: import("convex/values").GenericId<"packages">;
        file_path: string;
        content_hash: string;
        content: string;
        size: number;
    }, {
        package_id: import("convex/values").VId<import("convex/values").GenericId<"packages">, "required">;
        file_path: import("convex/values").VString<string, "required">;
        content_hash: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        size: import("convex/values").VFloat64<number, "required">;
    }, "required", "package_id" | "file_path" | "content_hash" | "content" | "size">, {
        by_package: ["package_id", "_creationTime"];
        by_hash: ["content_hash", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map