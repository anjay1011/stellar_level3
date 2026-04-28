#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_submit_and_get() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, FeedbackContract);
    let client = FeedbackContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let msg = String::from_str(&env, "Good!");
    client.submit_feedback(&user, &msg);
    assert_eq!(client.get_feedback(&user), msg);
}

#[test]
fn test_update() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, FeedbackContract);
    let client = FeedbackContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    client.submit_feedback(&user, &String::from_str(&env, "A"));
    client.submit_feedback(&user, &String::from_str(&env, "B"));
    assert_eq!(client.get_feedback(&user), String::from_str(&env, "B"));
}

#[test]
fn test_all_users() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, FeedbackContract);
    let client = FeedbackContractClient::new(&env, &contract_id);

    client.submit_feedback(&Address::generate(&env), &String::from_str(&env, "M"));
    client.submit_feedback(&Address::generate(&env), &String::from_str(&env, "N"));
    assert_eq!(client.get_all_users().len(), 2);
}
