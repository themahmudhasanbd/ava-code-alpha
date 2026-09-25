use super::types::*;

pub struct ContractDriftGate;

impl ContractDriftGate {
    pub fn evaluate(changed_files: &[String]) -> ContractDriftReport {
        let mut touched_contracts = Vec::new();
        let mut missing_counterparts = Vec::new();
        let mut violations = Vec::new();

        let mut has_db_migration = false;
        let mut has_proto = false;
        let mut has_graphql = false;
        let mut has_rust_types = false;
        let mut has_ts_types = false;

        for file in changed_files {
            let lower = file.to_lowercase();
            if lower.contains("migration") || lower.ends_with(".sql") {
                has_db_migration = true;
                touched_contracts.push(file.clone());
            }
            if lower.ends_with(".proto") {
                has_proto = true;
                touched_contracts.push(file.clone());
            }
            if lower.ends_with(".graphql") || lower.ends_with(".gql") {
                has_graphql = true;
                touched_contracts.push(file.clone());
            }
            if lower.contains("protocol") || lower.contains("schema.json") {
                touched_contracts.push(file.clone());
            }

            if lower.ends_with(".rs")
                && (lower.contains("model") || lower.contains("types") || lower.contains("entity"))
            {
                has_rust_types = true;
            }
            if (lower.ends_with(".ts") || lower.ends_with(".tsx"))
                && (lower.contains("types") || lower.contains("schema"))
            {
                has_ts_types = true;
            }
        }

        let has_contract_drift = !touched_contracts.is_empty();
        let mut drift_type = None;

        if has_db_migration {
            drift_type = Some("database_migration".to_string());
            if !has_rust_types && !has_ts_types {
                missing_counterparts.push("ORM / Data models in code".to_string());
                violations.push(
                    "Database migration detected without corresponding entity/type updates in application code."
                        .to_string(),
                );
            }
        } else if has_proto {
            drift_type = Some("protocol_buffer".to_string());
            if !has_rust_types {
                missing_counterparts.push("Generated Rust/Proto client bindings".to_string());
                violations.push(
                    "Protobuf schema modified without updating generated client/server bindings."
                        .to_string(),
                );
            }
        } else if has_graphql {
            drift_type = Some("graphql_schema".to_string());
            if !has_ts_types {
                missing_counterparts.push("Generated GraphQL query/mutation types".to_string());
                violations.push(
                    "GraphQL schema modified without updating client query definitions or types."
                        .to_string(),
                );
            }
        }

        ContractDriftReport {
            has_contract_drift,
            drift_type,
            touched_contracts,
            missing_counterparts,
            violations,
        }
    }
}
