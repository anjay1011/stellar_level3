#![no_std]
mod test;
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
pub enum DataKey {
    Feedback(Address),
    AllUsers,
}

#[contract]
pub struct FeedbackContract;

#[contractimpl]
impl FeedbackContract {
    pub fn submit_feedback(env: Env, sender: Address, message: String) {
        sender.require_auth();
        env.storage().persistent().set(&DataKey::Feedback(sender.clone()), &message);

        let mut users: Vec<Address> = env.storage().persistent().get(&DataKey::AllUsers).unwrap_or(Vec::new(&env));
        if !users.contains(&sender) {
            users.push_back(sender);
            env.storage().persistent().set(&DataKey::AllUsers, &users);
        }
    }

    pub fn get_feedback(env: Env, user: Address) -> String {
        env.storage().persistent().get(&DataKey::Feedback(user)).unwrap_or(String::from_str(&env, "No feedback found."))
    }

    pub fn get_all_users(env: Env) -> Vec<Address> {
        env.storage().persistent().get(&DataKey::AllUsers).unwrap_or(Vec::new(&env))
    }
}
