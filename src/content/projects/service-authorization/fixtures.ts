// MIT: authored executable Rust, fixed mutations, and compiler controls.
export const libSource = String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        request: Request,
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`;

export const starterLibSource = String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            /*BODY-policy*/
            todo!("implement this operation") /*END-policy*/
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            /*BODY-binding*/
            todo!("implement this operation") /*END-binding*/
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        /*BODY-attenuation*/
        todo!("implement this operation") /*END-attenuation*/
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        request: Request,
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        /*BODY-admission*/
        todo!("implement this operation") /*END-admission*/
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`;

export const policyTests = String.raw`use service_authorization_workshop::*;
fn principal() -> Principal {
    Principal {
        subject: PrincipalId(1),
        tenant: TenantId(10),
    }
}
fn grant() -> GrantSpec {
    GrantSpec {
        subject: PrincipalId(1),
        tenant: TenantId(10),
        scope: Scope::Tenant,
        actions: ActionSet::new(true, true),
        max_cost: 4,
    }
}
fn request(cost: u64) -> Request {
    Request {
        resource: Resource {
            tenant: TenantId(10),
            id: ResourceId(7),
        },
        action: Action::Append,
        cost,
        payload: "line-α".into(),
    }
}
#[test]
fn exact_scope_is_tenant_bound() {
    let a = Authority::new(vec![grant()]);
    let mut q = request(4);
    q.resource.tenant = TenantId(20);
    assert_eq!(a.decide(principal(), &q), Err(Denial::TenantMismatch));
    assert_eq!(
        a.decide(
            Principal {
                tenant: TenantId(20),
                ..principal()
            },
            &q
        ),
        Err(Denial::NoMatchingGrant)
    );
    assert_eq!(a.decide(principal(), &request(4)), Ok(()));
}
#[test]
fn same_grant_and_tenant_are_required() {
    let a = Authority::new(vec![GrantSpec {
        tenant: TenantId(20),
        ..grant()
    }]);
    assert_eq!(
        a.decide(principal(), &request(4)),
        Err(Denial::NoMatchingGrant)
    );
}
#[test]
fn grants_cannot_be_spliced() {
    let x = GrantSpec {
        scope: Scope::Resource(ResourceId(8)),
        actions: ActionSet::new(true, false),
        max_cost: 0,
        ..grant()
    };
    let y = GrantSpec {
        subject: PrincipalId(2),
        scope: Scope::Resource(ResourceId(7)),
        actions: ActionSet::new(false, true),
        ..grant()
    };
    for grants in [vec![x, y], vec![y, x], vec![x, x, y, y]] {
        assert_eq!(
            Authority::new(grants).decide(principal(), &request(4)),
            Err(Denial::NoMatchingGrant)
        );
    }
    assert_eq!(
        Authority::new(vec![x, y, grant()]).decide(principal(), &request(4)),
        Ok(())
    );
}
#[test]
fn decision_boundaries() {
    assert_eq!(
        Authority::new(vec![]).decide(principal(), &request(0)),
        Err(Denial::NoMatchingGrant)
    );
    let a = Authority::new(vec![grant()]);
    for (cost, want) in [(0, Ok(())), (4, Ok(())), (5, Err(Denial::NoMatchingGrant))] {
        assert_eq!(a.decide(principal(), &request(cost)), want);
    }
    assert_eq!(
        a.decide(
            Principal {
                subject: PrincipalId(2),
                ..principal()
            },
            &request(4)
        ),
        Err(Denial::NoMatchingGrant)
    );
    assert_eq!(
        Authority::new(vec![GrantSpec {
            actions: ActionSet::new(true, false),
            ..grant()
        }])
        .decide(principal(), &request(4)),
        Err(Denial::NoMatchingGrant)
    );
    let mut q = request(4);
    q.resource.id = ResourceId(8);
    assert_eq!(
        Authority::new(vec![GrantSpec {
            scope: Scope::Resource(ResourceId(7)),
            ..grant()
        }])
        .decide(principal(), &q),
        Err(Denial::NoMatchingGrant)
    );
    for grants in [
        vec![grant(), grant()],
        vec![
            GrantSpec {
                subject: PrincipalId(2),
                ..grant()
            },
            grant(),
        ],
        vec![
            grant(),
            GrantSpec {
                subject: PrincipalId(2),
                ..grant()
            },
        ],
    ] {
        assert_eq!(
            Authority::new(grants).decide(principal(), &request(4)),
            Ok(())
        );
    }
}
`;

export const attenuationTests = String.raw`use service_authorization_workshop::*;
fn principal() -> Principal {
    Principal {
        subject: PrincipalId(1),
        tenant: TenantId(10),
    }
}
fn grant() -> GrantSpec {
    GrantSpec {
        subject: PrincipalId(1),
        tenant: TenantId(10),
        scope: Scope::Tenant,
        actions: ActionSet::new(true, true),
        max_cost: 4,
    }
}
fn request(cost: u64) -> Request {
    Request {
        resource: Resource {
            tenant: TenantId(10),
            id: ResourceId(7),
        },
        action: Action::Append,
        cost,
        payload: "line-α".into(),
    }
}
fn limits() -> Limits {
    Limits {
        max_accepted: 10,
        max_cost: 20,
    }
}
#[test]
fn attenuation_rejects_amplification() {
    let p = GrantSpec {
        scope: Scope::Resource(ResourceId(7)),
        actions: ActionSet::new(false, true),
        ..grant()
    };
    for child in [
        GrantSpec {
            subject: PrincipalId(2),
            ..p
        },
        GrantSpec {
            tenant: TenantId(20),
            ..p
        },
        GrantSpec {
            scope: Scope::Tenant,
            ..p
        },
        GrantSpec {
            scope: Scope::Resource(ResourceId(8)),
            ..p
        },
        GrantSpec {
            actions: ActionSet::new(true, true),
            ..p
        },
        GrantSpec { max_cost: 5, ..p },
    ] {
        assert_eq!(
            attenuate(&p, child),
            Err(AttenuationError::WouldAmplify),
            "child: {child:?}"
        );
    }
    for child in [
        p,
        GrantSpec {
            actions: ActionSet::new(false, false),
            max_cost: 0,
            ..p
        },
    ] {
        assert_eq!(attenuate(&p, child), Ok(child));
    }
}
#[test]
fn child_is_exact_and_monotone() {
    let p = grant();
    let child = GrantSpec {
        scope: Scope::Resource(ResourceId(7)),
        actions: ActionSet::new(false, true),
        max_cost: 2,
        ..p
    };
    assert_eq!(attenuate(&p, child), Ok(child));
    let parent = Authority::new(vec![p]);
    let narrowed = Authority::new(vec![child]);
    for subject in [1, 2] {
        for tenant in [10, 20] {
            for resource in [7, 8] {
                for action in [Action::Read, Action::Append] {
                    for cost in [0, 2, 3, 4, 5] {
                        let principal = Principal {
                            subject: PrincipalId(subject),
                            tenant: TenantId(tenant),
                        };
                        let q = Request {
                            resource: Resource {
                                tenant: TenantId(tenant),
                                id: ResourceId(resource),
                            },
                            action,
                            cost,
                            payload: "finite".into(),
                        };
                        let child_allows = subject == 1
                            && tenant == 10
                            && resource == 7
                            && action == Action::Append
                            && cost <= 2;
                        let parent_allows = subject == 1 && tenant == 10 && cost <= 4;
                        assert_eq!(narrowed.decide(principal, &q).is_ok(), child_allows);
                        assert_eq!(parent.decide(principal, &q).is_ok(), parent_allows);
                        assert!(!child_allows || parent_allows);
                    }
                }
            }
        }
    }
}
#[test]
fn installing_child_changes_effective_policy() {
    let p = GrantSpec {
        max_cost: 100,
        ..grant()
    };
    let child = attenuate(
        &p,
        GrantSpec {
            scope: Scope::Resource(ResourceId(7)),
            actions: ActionSet::new(false, true),
            max_cost: 4,
            ..p
        },
    )
    .unwrap();
    let mut restricted = Service::new(vec![child], limits());
    let accepted = restricted.submit(principal(), request(4)).unwrap();
    assert_eq!(accepted.request(), &request(4));
    assert_eq!(accepted.principal(), principal());
    for which in 0..3 {
        let mut q = request(4);
        match which {
            0 => q.resource.id = ResourceId(8),
            1 => q.action = Action::Read,
            _ => q.cost = 5,
        };
        let before = restricted.snapshot();
        assert_eq!(
            restricted.submit(principal(), q),
            Err(SubmitError::Denied(Denial::NoMatchingGrant))
        );
        assert_eq!(restricted.snapshot(), before);
    }
    assert_eq!(
        attenuate(
            &child,
            GrantSpec {
                scope: Scope::Tenant,
                ..child
            }
        ),
        Err(AttenuationError::WouldAmplify)
    );
    let mut broad = Service::new(vec![p], limits());
    let mut q = request(4);
    q.resource.id = ResourceId(8);
    assert!(broad.submit(principal(), q).is_ok());
    broad.replace_grants(vec![child]);
    let mut q = request(4);
    q.resource.id = ResourceId(8);
    assert_eq!(
        broad.submit(principal(), q),
        Err(SubmitError::Denied(Denial::NoMatchingGrant))
    );
}
`;

export const bindingTests = String.raw`use service_authorization_workshop::*;
fn principal() -> Principal {
    Principal {
        subject: PrincipalId(1),
        tenant: TenantId(10),
    }
}
fn grant() -> GrantSpec {
    GrantSpec {
        subject: PrincipalId(1),
        tenant: TenantId(10),
        scope: Scope::Tenant,
        actions: ActionSet::new(true, true),
        max_cost: 4,
    }
}
fn request(cost: u64) -> Request {
    Request {
        resource: Resource {
            tenant: TenantId(10),
            id: ResourceId(7),
        },
        action: Action::Append,
        cost,
        payload: "line-α".into(),
    }
}
#[test]
fn authorized_owns_exact_request_and_principal() {
    let a = Authority::new(vec![grant()]);
    let w = a.authorize(principal(), request(4)).unwrap();
    assert_eq!(w.principal(), principal());
    assert_eq!(w.request(), &request(4));
    let p = Principal {
        subject: PrincipalId(2),
        tenant: TenantId(20),
    };
    let a2 = Authority::new(vec![GrantSpec {
        subject: p.subject,
        tenant: p.tenant,
        ..grant()
    }]);
    let q = || Request {
        resource: Resource {
            tenant: TenantId(20),
            id: ResourceId(9),
        },
        action: Action::Read,
        cost: 3,
        payload: "różne-β".into(),
    };
    let w = a2.authorize(p, q()).unwrap();
    assert_eq!(w.principal(), p);
    assert_eq!(w.request(), &q());
    assert_eq!(
        Authority::new(vec![])
            .authorize(principal(), request(4))
            .unwrap_err(),
        Denial::NoMatchingGrant
    );
}
#[test]
fn policy_borrow_and_reissue_are_bounded() {
    let mut a = Authority::new(vec![grant()]);
    let w = a.authorize(principal(), request(4)).unwrap();
    drop(w);
    let w2 = a.authorize(principal(), request(4)).unwrap();
    drop(w2);
    a.replace_grants(vec![]);
    assert_eq!(
        a.authorize(principal(), request(4)).unwrap_err(),
        Denial::NoMatchingGrant
    );
}
`;

export const admissionTests = String.raw`use service_authorization_workshop::*;
fn principal() -> Principal {
    Principal {
        subject: PrincipalId(1),
        tenant: TenantId(10),
    }
}
fn grant() -> GrantSpec {
    GrantSpec {
        subject: PrincipalId(1),
        tenant: TenantId(10),
        scope: Scope::Tenant,
        actions: ActionSet::new(true, true),
        max_cost: 4,
    }
}
fn request(cost: u64) -> Request {
    Request {
        resource: Resource {
            tenant: TenantId(10),
            id: ResourceId(7),
        },
        action: Action::Append,
        cost,
        payload: "line-α".into(),
    }
}
fn limits() -> Limits {
    Limits {
        max_accepted: 10,
        max_cost: 20,
    }
}
#[test]
fn facade_checks_its_own_authority_before_admission() {
    let mut a = Service::new(vec![], limits());
    a.close();
    let before = a.snapshot();
    assert_eq!(
        a.submit(principal(), request(4)),
        Err(SubmitError::Denied(Denial::NoMatchingGrant))
    );
    assert_eq!(a.snapshot(), before);
    let mut b = Service::new(vec![grant()], limits());
    let accepted = b.submit(principal(), request(4)).unwrap();
    assert_eq!(accepted.principal(), principal());
    assert_eq!(accepted.request(), &request(4));
    let mut full = Service::new(
        vec![],
        Limits {
            max_accepted: 0,
            max_cost: 0,
        },
    );
    let before = full.snapshot();
    assert_eq!(
        full.submit(principal(), request(4)),
        Err(SubmitError::Denied(Denial::NoMatchingGrant))
    );
    assert_eq!(full.snapshot(), before);
}
#[test]
fn admission_is_atomic_and_budget_equality_is_allowed() {
    let mut s = Service::new(
        vec![grant()],
        Limits {
            max_accepted: 2,
            max_cost: 4,
        },
    );
    let result = s.submit(principal(), request(4));
    assert!(result.is_ok());
    let a = result.unwrap();
    assert_eq!(a.principal(), principal());
    assert_eq!(a.request(), &request(4));
    assert_eq!((s.snapshot().accepted, s.snapshot().charged_cost), (1, 4));
    let before = s.snapshot();
    assert_eq!(
        s.submit(principal(), request(1)),
        Err(SubmitError::Admission(AdmissionRejection::CostBudget))
    );
    assert_eq!(s.snapshot(), before);
    assert!(s.submit(principal(), request(0)).is_ok());
    assert_eq!((s.snapshot().accepted, s.snapshot().charged_cost), (2, 4));
    let before = s.snapshot();
    assert_eq!(
        s.submit(principal(), request(0)),
        Err(SubmitError::Admission(AdmissionRejection::Capacity))
    );
    assert_eq!(s.snapshot(), before);
    s.close();
    let before = s.snapshot();
    assert_eq!(
        s.submit(principal(), request(0)),
        Err(SubmitError::Admission(AdmissionRejection::Closed))
    );
    assert_eq!(s.snapshot(), before);
}
`;

export const semanticMutations = [
  {
    "id": "M01",
    "marker": String.raw`// A11-M01
            if principal.tenant != request.resource.tenant`,
    "replacement": String.raw`// A11-M01
            if false`,
    "testName": "exact_scope_is_tenant_bound"
  },
  {
    "id": "M02",
    "marker": String.raw`// A11-M02
 grant.tenant == request.resource.tenant`,
    "replacement": String.raw`// A11-M02
 true`,
    "testName": "same_grant_and_tenant_are_required"
  },
  {
    "id": "M03",
    "marker": String.raw`// A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            }`,
    "replacement": String.raw`// A11-M03
            let allowed = self.grants.iter().any(|g| g.subject == principal.subject)
                && self.grants.iter().any(|g| {
                    g.tenant == request.resource.tenant
                        && match g.scope {
                            Scope::Tenant => true,
                            Scope::Resource(id) => id == request.resource.id,
                        }
                })
                && self
                    .grants
                    .iter()
                    .any(|g| g.actions.contains(request.action) && request.cost <= g.max_cost`,
    "testName": "grants_cannot_be_spliced"
  },
  {
    "id": "M04",
    "marker": String.raw`// A11-M04
 request.cost <=`,
    "replacement": String.raw`// A11-M04
 request.cost <`,
    "testName": "decision_boundaries"
  },
  {
    "id": "M05",
    "marker": String.raw`// A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        }`,
    "replacement": String.raw`// A11-M05
        let scope_ok = true`,
    "testName": "attenuation_rejects_amplification"
  },
  {
    "id": "M06",
    "marker": String.raw`// A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions)`,
    "replacement": String.raw`// A11-M06
        let actions_ok = true`,
    "testName": "attenuation_rejects_amplification"
  },
  {
    "id": "M07",
    "marker": String.raw`// A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost`,
    "replacement": String.raw`// A11-M07
        let cost_ok = true`,
    "testName": "attenuation_rejects_amplification"
  },
  {
    "id": "M08",
    "marker": String.raw`// A11-M08
        Ok(requested`,
    "replacement": String.raw`// A11-M08
        Ok(*parent`,
    "testName": "child_is_exact_and_monotone"
  },
  {
    "id": "M09",
    "marker": String.raw`// A11-M09
            self.authority.replace_grants(grants)`,
    "replacement": String.raw`// A11-M09
            let _ = grants`,
    "testName": "installing_child_changes_effective_policy"
  },
  {
    "id": "M10",
    "marker": String.raw`// A11-M10
                request`,
    "replacement": String.raw`// A11-M10
                request: Request {
                    payload: String::new(),
                    ..request
                }`,
    "testName": "authorized_owns_exact_request_and_principal"
  },
  {
    "id": "M11",
    "marker": String.raw`// A11-M11
                principal`,
    "replacement": String.raw`// A11-M11
                principal: Principal {
                    subject: PrincipalId(0),
                    tenant: principal.tenant,
                }`,
    "testName": "authorized_owns_exact_request_and_principal"
  },
  {
    "id": "M12",
    "marker": String.raw`// A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?`,
    "replacement": String.raw`// A11-M12
            let authorized = Authorized {
                authority: &self.authority,
                principal,
                request,
            }`,
    "testName": "facade_checks_its_own_authority_before_admission"
  },
  {
    "id": "M13",
    "marker": String.raw`// A11-M13
        // Candidates remain local until both checks succeed.`,
    "replacement": String.raw`// A11-M13
        state.accepted = next_accepted;`,
    "testName": "admission_is_atomic_and_budget_equality_is_allowed"
  },
  {
    "id": "M14",
    "marker": String.raw`// A11-M14
        if next_cost >`,
    "replacement": String.raw`// A11-M14
        if next_cost >=`,
    "testName": "admission_is_atomic_and_budget_equality_is_allowed"
  },
  {
    "id": "M15",
    "marker": String.raw`// A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?`,
    "replacement": String.raw`// A11-M15
        let next_accepted = state.accepted.wrapping_add(1)`,
    "testName": "boundary::tests::accepted_overflow_is_not_capacity_or_wrap"
  },
  {
    "id": "M16",
    "marker": String.raw`// A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?`,
    "replacement": String.raw`// A11-M16
        let next_cost = state.charged_cost.wrapping_add(request.cost)`,
    "testName": "boundary::tests::charged_cost_overflow_does_not_commit_accepted"
  }
] as const;

export const compilerProbes = {
  "helpers": String.raw`use service_authorization_workshop::*;
fn principal()->Principal {Principal {subject:PrincipalId(1),tenant:TenantId(10)}}
fn request()->Request {Request {resource:Resource {tenant:TenantId(10),id:ResourceId(7)},action:Action::Append,cost:4,payload:"line-α".into()}}
fn grants()->Vec<GrantSpec> {vec![GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:4}]}
fn authority()->Authority {Authority::new(grants())}
`,
  "baseline": "let a=authority();let w=a.authorize(principal(),request()).unwrap();assert_eq!(w.principal(),principal());assert_eq!(w.request(),&request());drop(w);let mut s=Service::new(grants(),Limits {max_accepted:10,max_cost:20});let r=s.submit(principal(),request()).unwrap();assert_eq!(r.principal(),principal());assert_eq!(r.request(),&request());let mut snapshot=s.snapshot();snapshot.accepted=99;assert_eq!(s.snapshot().accepted,1);",
  "cases": [
    {
      "id": "private-construction",
      "body": "let a=authority();let _=Authorized {authority:&a,principal:principal(),request:request()};",
      "code": "E0451",
      "symbol": "Authorized",
      "relaxedSource": String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        pub authority: &'a Authority,
        pub principal: Principal,
        pub request: Request,
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
      "positiveBody": "let a=authority();let _=Authorized {authority:&a,principal:principal(),request:request()};",
      "internal": false
    },
    {
      "id": "private-request-mutation",
      "body": "let a=authority();let mut w=a.authorize(principal(),request()).unwrap();w.request.cost=0;",
      "code": "E0616",
      "symbol": "request",
      "relaxedSource": String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        pub request: Request,
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
      "positiveBody": "let a=authority();let mut w=a.authorize(principal(),request()).unwrap();w.request.cost=0;",
      "internal": false
    },
    {
      "id": "no-clone",
      "body": "let a=authority();let w=a.authorize(principal(),request()).unwrap();let _copy:Authorized<'_>=w.clone();",
      "code": "E0599",
      "symbol": "clone",
      "relaxedSource": String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        request: Request,
    }
    impl Clone for Authorized<'_> {
        fn clone(&self) -> Self {
            Self {
                authority: self.authority,
                principal: self.principal,
                request: Request {
                    resource: self.request.resource,
                    action: self.request.action,
                    cost: self.request.cost,
                    payload: self.request.payload.clone(),
                },
            }
        }
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
      "positiveBody": "let a=authority();let w=a.authorize(principal(),request()).unwrap();let _copy:Authorized<'_>=w.clone();",
      "internal": false
    },
    {
      "id": "moved-witness",
      "body": "let a=authority();let w=a.authorize(principal(),request()).unwrap();drop(w);let _=w.request();",
      "code": "E0382",
      "symbol": "w",
      "relaxedSource": String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        request: Request,
    }
    impl Clone for Authorized<'_> {
        fn clone(&self) -> Self {
            Self {
                authority: self.authority,
                principal: self.principal,
                request: Request {
                    resource: self.request.resource,
                    action: self.request.action,
                    cost: self.request.cost,
                    payload: self.request.payload.clone(),
                },
            }
        }
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
      "positiveBody": "let a=authority();let w=a.authorize(principal(),request()).unwrap();drop(w.clone());let _=w.request();",
      "internal": false
    },
    {
      "id": "live-policy-borrow",
      "body": "let mut a=authority();let w=a.authorize(principal(),request()).unwrap();a.replace_grants(vec![]);let _=w.request();",
      "code": "E0502",
      "symbol": "a",
      "relaxedSource": String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize(
            &self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: 0,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized {
        authority: usize,
        principal: Principal,
        request: Request,
    }
    impl Authorized {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
      "positiveBody": "let mut a=authority();let w=a.authorize(principal(),request()).unwrap();a.replace_grants(vec![]);let _=w.request();",
      "internal": false
    },
    {
      "id": "private-admit",
      "body": "let a=authority();let w=a.authorize(principal(),request()).unwrap();service_authorization_workshop::boundary::admit(w,todo!());",
      "code": "E0603",
      "symbol": "boundary",
      "relaxedSource": String.raw`#![forbid(unsafe_code)]
pub mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        request: Request,
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    pub struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    pub fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
    pub fn empty_state() -> AdmissionState {
        AdmissionState {
            accepting: true,
            accepted: 0,
            charged_cost: 0,
            limits: Limits {
                max_accepted: 10,
                max_cost: 20,
            },
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
      "positiveBody": "let a=authority();let w=a.authorize(principal(),request()).unwrap();service_authorization_workshop::boundary::admit(w,&mut service_authorization_workshop::boundary::empty_state()).unwrap();",
      "internal": false
    },
    {
      "id": "service-witness-intake",
      "body": "let a=authority();let w=a.authorize(principal(),request()).unwrap();let mut s=Service::new(grants(),Limits {max_accepted:10,max_cost:20});let _=s.submit(w);",
      "code": "E0061",
      "symbol": "submit",
      "relaxedSource": String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        request: Request,
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
      "positiveBody": "let mut s=Service::new(grants(),Limits {max_accepted:10,max_cost:20});let _=s.submit(principal(),request());",
      "internal": false
    },
    {
      "id": "consuming-admit-internal",
      "body": "let a=Authority::new(vec![GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:4}]);let p=Principal {subject:PrincipalId(1),tenant:TenantId(10)};let q=||Request {resource:Resource {tenant:TenantId(10),id:ResourceId(7)},action:Action::Append,cost:4,payload:\"line-α\".into()};let mut state=AdmissionState {accepting:true,accepted:0,charged_cost:0,limits:Limits {max_accepted:10,max_cost:20}};let w=a.authorize(p,q()).unwrap();let _=admit(w,&mut state);let _=admit(w,&mut state);",
      "code": "E0382",
      "symbol": "w",
      "relaxedSource": String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        request: Request,
    }
    impl Clone for Authorized<'_> {
        fn clone(&self) -> Self {
            Self {
                authority: self.authority,
                principal: self.principal,
                request: Request {
                    resource: self.request.resource,
                    action: self.request.action,
                    cost: self.request.cost,
                    payload: self.request.payload.clone(),
                },
            }
        }
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
      "positiveBody": "let a=Authority::new(vec![GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:4}]);let p=Principal {subject:PrincipalId(1),tenant:TenantId(10)};let q=||Request {resource:Resource {tenant:TenantId(10),id:ResourceId(7)},action:Action::Append,cost:4,payload:\"line-α\".into()};let mut state=AdmissionState {accepting:true,accepted:0,charged_cost:0,limits:Limits {max_accepted:10,max_cost:20}};let w=a.authorize(p,q()).unwrap();let _=admit(w.clone(),&mut state);let _=admit(w,&mut state);",
      "internal": true
    }
  ],
  "cloneSource": String.raw`#![forbid(unsafe_code)]
mod boundary {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct PrincipalId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct TenantId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ResourceId(pub u64);
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Principal {
        pub subject: PrincipalId,
        pub tenant: TenantId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Resource {
        pub tenant: TenantId,
        pub id: ResourceId,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Action {
        Read,
        Append,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Scope {
        Tenant,
        Resource(ResourceId),
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct ActionSet {
        read: bool,
        append: bool,
    }
    impl ActionSet {
        pub const fn new(read: bool, append: bool) -> Self {
            Self { read, append }
        }
        pub fn contains(self, action: Action) -> bool {
            match action {
                Action::Read => self.read,
                Action::Append => self.append,
            }
        }
        fn subset_of(self, parent: Self) -> bool {
            (!self.read || parent.read) && (!self.append || parent.append)
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct GrantSpec {
        pub subject: PrincipalId,
        pub tenant: TenantId,
        pub scope: Scope,
        pub actions: ActionSet,
        pub max_cost: u64,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Request {
        pub resource: Resource,
        pub action: Action,
        pub cost: u64,
        pub payload: String,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Denial {
        TenantMismatch,
        NoMatchingGrant,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AttenuationError {
        WouldAmplify,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum AdmissionRejection {
        Closed,
        Capacity,
        CostBudget,
        CounterOverflow,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum SubmitError {
        Denied(Denial),
        Admission(AdmissionRejection),
    }
    #[derive(Debug)]
    pub struct Authority {
        grants: Vec<GrantSpec>,
    }
    impl Authority {
        pub fn new(grants: Vec<GrantSpec>) -> Self {
            Self { grants }
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            self.grants = grants;
        }
        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }
        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }
    }
    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }
    #[derive(Debug)]
    pub struct Authorized<'a> {
        authority: &'a Authority,
        principal: Principal,
        request: Request,
    }
    impl Clone for Authorized<'_> {
        fn clone(&self) -> Self {
            Self {
                authority: self.authority,
                principal: self.principal,
                request: Request {
                    resource: self.request.resource,
                    action: self.request.action,
                    cost: self.request.cost,
                    payload: self.request.payload.clone(),
                },
            }
        }
    }
    impl Authorized<'_> {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct Limits {
        pub max_accepted: u64,
        pub max_cost: u64,
    }
    #[derive(Debug)]
    struct AdmissionState {
        accepting: bool,
        accepted: u64,
        charged_cost: u64,
        limits: Limits,
    }
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct LedgerSnapshot {
        pub accepting: bool,
        pub accepted: u64,
        pub charged_cost: u64,
        pub limits: Limits,
    }
    #[derive(Debug, PartialEq, Eq)]
    pub struct Accepted {
        principal: Principal,
        request: Request,
    }
    impl Accepted {
        pub fn principal(&self) -> Principal {
            self.principal
        }
        pub fn request(&self) -> &Request {
            &self.request
        }
    }
    #[derive(Debug)]
    pub struct Service {
        authority: Authority,
        state: AdmissionState,
    }
    impl Service {
        pub fn new(grants: Vec<GrantSpec>, limits: Limits) -> Self {
            Self {
                authority: Authority::new(grants),
                state: AdmissionState {
                    accepting: true,
                    accepted: 0,
                    charged_cost: 0,
                    limits,
                },
            }
        }
        pub fn submit(
            &mut self,
            principal: Principal,
            request: Request,
        ) -> Result<Accepted, SubmitError> {
            // A11-M12
            let authorized = self
                .authority
                .authorize(principal, request)
                .map_err(SubmitError::Denied)?;
            admit(authorized, &mut self.state).map_err(SubmitError::Admission)
        }
        pub fn snapshot(&self) -> LedgerSnapshot {
            LedgerSnapshot {
                accepting: self.state.accepting,
                accepted: self.state.accepted,
                charged_cost: self.state.charged_cost,
                limits: self.state.limits,
            }
        }
        pub fn close(&mut self) {
            self.state.accepting = false;
        }
        pub fn replace_grants(&mut self, grants: Vec<GrantSpec>) {
            // A11-M09
            self.authority.replace_grants(grants);
        }
    }
    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        fn setup(accepted: u64, charged_cost: u64) -> (Authority, AdmissionState) {
            (
                Authority::new(vec![GrantSpec {
                    subject: PrincipalId(1),
                    tenant: TenantId(10),
                    scope: Scope::Tenant,
                    actions: ActionSet::new(true, true),
                    max_cost: 4,
                }]),
                AdmissionState {
                    accepting: true,
                    accepted,
                    charged_cost,
                    limits: Limits {
                        max_accepted: u64::MAX,
                        max_cost: u64::MAX,
                    },
                },
            )
        }
        fn p() -> Principal {
            Principal {
                subject: PrincipalId(1),
                tenant: TenantId(10),
            }
        }
        fn q(cost: u64) -> Request {
            Request {
                resource: Resource {
                    tenant: TenantId(10),
                    id: ResourceId(7),
                },
                action: Action::Append,
                cost,
                payload: "line-α".into(),
            }
        }
        #[test]
        fn accepted_overflow_is_not_capacity_or_wrap() {
            let (a, mut s) = setup(u64::MAX, 0);
            assert_eq!(
                admit(a.authorize(p(), q(0)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (u64::MAX, 0));
        }
        #[test]
        fn charged_cost_overflow_does_not_commit_accepted() {
            let (a, mut s) = setup(0, u64::MAX);
            assert_eq!(
                admit(a.authorize(p(), q(1)).unwrap(), &mut s),
                Err(AdmissionRejection::CounterOverflow)
            );
            assert_eq!((s.accepted, s.charged_cost), (0, u64::MAX));
        }
        #[test]
        fn dropped_authorization_does_not_touch_ledger() {
            let (a, mut s) = setup(0, 0);
            drop(a.authorize(p(), q(4)).unwrap());
            assert_eq!((s.accepted, s.charged_cost), (0, 0));
            let accepted = admit(a.authorize(p(), q(4)).unwrap(), &mut s).unwrap();
            assert_eq!(accepted.principal(), p());
            assert_eq!(accepted.request(), &q(4));
            assert_eq!((s.accepted, s.charged_cost), (1, 4));
        }
    }
}
pub use boundary::{
    Accepted, Action, ActionSet, AdmissionRejection, AttenuationError, Authority, Authorized,
    Denial, GrantSpec, LedgerSnapshot, Limits, Principal, PrincipalId, Request, Resource,
    ResourceId, Scope, Service, SubmitError, TenantId, attenuate,
};
`,
  "movedFreshPositive": "let a=authority();let w=a.authorize(principal(),request()).unwrap();drop(w);let w2=a.authorize(principal(),request()).unwrap();let _=w2.request();",
  "internalFreshPositive": "let a=Authority::new(vec![GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:4}]);let p=Principal {subject:PrincipalId(1),tenant:TenantId(10)};let q=||Request {resource:Resource {tenant:TenantId(10),id:ResourceId(7)},action:Action::Append,cost:4,payload:\"line-α\".into()};let mut state=AdmissionState {accepting:true,accepted:0,charged_cost:0,limits:Limits {max_accepted:10,max_cost:20}};let w=a.authorize(p,q()).unwrap();let _=admit(w,&mut state);let w2=a.authorize(p,q()).unwrap();let _=admit(w2,&mut state);",
  "equivalents": [
    {
      "name": "policy",
      "marker": String.raw`        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            // A11-M01
            if principal.tenant != request.resource.tenant {
                return Err(Denial::TenantMismatch);
            }
            // A11-M03
            let allowed = self.grants.iter().any(|grant| {
                grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
            });
            if allowed {
                Ok(())
            } else {
                Err(Denial::NoMatchingGrant)
            }
        }`,
      "replacement": String.raw`        pub fn decide(&self, principal: Principal, request: &Request) -> Result<(), Denial> {
            if request.resource.tenant != principal.tenant {
                return Err(Denial::TenantMismatch);
            }
            for g in &self.grants {
                if g.subject != principal.subject || g.tenant != request.resource.tenant {
                    continue;
                }
                match g.scope {
                    Scope::Resource(id) if id != request.resource.id => continue,
                    _ => {}
                }
                if !g.actions.contains(request.action) || g.max_cost < request.cost {
                    continue;
                }
                return Ok(());
            }
            Err(Denial::NoMatchingGrant)
        }`
    },
    {
      "name": "attenuation",
      "marker": String.raw`    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        // A11-M05
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        // A11-M06
        let actions_ok = requested.actions.subset_of(parent.actions);
        // A11-M07
        let cost_ok = requested.max_cost <= parent.max_cost;
        if requested.subject != parent.subject
            || requested.tenant != parent.tenant
            || !scope_ok
            || !actions_ok
            || !cost_ok
        {
            return Err(AttenuationError::WouldAmplify);
        }
        // A11-M08
        Ok(requested)
    }`,
      "replacement": String.raw`    pub fn attenuate(
        parent: &GrantSpec,
        requested: GrantSpec,
    ) -> Result<GrantSpec, AttenuationError> {
        let identity = match (
            requested.subject == parent.subject,
            requested.tenant == parent.tenant,
        ) {
            (true, true) => true,
            _ => false,
        };
        let scope = match parent.scope {
            Scope::Tenant => true,
            Scope::Resource(p) => match requested.scope {
                Scope::Resource(c) => p == c,
                Scope::Tenant => false,
            },
        };
        let actions = match (requested.actions.read, requested.actions.append) {
            (false, false) => true,
            (true, false) => parent.actions.read,
            (false, true) => parent.actions.append,
            (true, true) => parent.actions.read && parent.actions.append,
        };
        let cost = match requested.max_cost.cmp(&parent.max_cost) {
            std::cmp::Ordering::Greater => false,
            _ => true,
        };
        if identity && scope && actions && cost {
            Ok(requested)
        } else {
            Err(AttenuationError::WouldAmplify)
        }
    }`
    },
    {
      "name": "binding",
      "marker": String.raw`        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            self.decide(principal, &request)?;
            Ok(Authorized {
                authority: self,
                // A11-M11
                principal,
                // A11-M10
                request,
            })
        }`,
      "replacement": String.raw`        pub fn authorize<'a>(
            &'a self,
            principal: Principal,
            request: Request,
        ) -> Result<Authorized<'a>, Denial> {
            match self.decide(principal, &request) {
                Ok(()) => Ok(Authorized {
                    authority: self,
                    principal,
                    request,
                }),
                Err(reason) => Err(reason),
            }
        }`
    },
    {
      "name": "admission",
      "marker": String.raw`    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        use AdmissionRejection::*;
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(Closed);
        }
        // A11-M15
        let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
        if next_accepted > state.limits.max_accepted {
            return Err(Capacity);
        }
        // A11-M13
        // Candidates remain local until both checks succeed.
        // A11-M16
        let next_cost = state
            .charged_cost
            .checked_add(request.cost)
            .ok_or(CounterOverflow)?;
        // A11-M14
        if next_cost > state.limits.max_cost {
            return Err(CostBudget);
        }
        state.accepted = next_accepted;
        state.charged_cost = next_cost;
        Ok(Accepted { principal, request })
    }`,
      "replacement": String.raw`    fn admit(
        authorized: Authorized<'_>,
        state: &mut AdmissionState,
    ) -> Result<Accepted, AdmissionRejection> {
        let Authorized {
            authority: _authority,
            principal,
            request,
        } = authorized;
        if !state.accepting {
            return Err(AdmissionRejection::Closed);
        }
        let accepted = match state.accepted.checked_add(1) {
            Some(n) => n,
            None => return Err(AdmissionRejection::CounterOverflow),
        };
        if state.limits.max_accepted < accepted {
            return Err(AdmissionRejection::Capacity);
        }
        let charged = match state.charged_cost.checked_add(request.cost) {
            Some(n) => n,
            None => return Err(AdmissionRejection::CounterOverflow),
        };
        if state.limits.max_cost < charged {
            return Err(AdmissionRejection::CostBudget);
        }
        *state = AdmissionState {
            accepting: state.accepting,
            accepted,
            charged_cost: charged,
            limits: state.limits,
        };
        Ok(Accepted { principal, request })
    }`
    }
  ]
} as const;

// CC BY 4.0: original Polish teaching prose.
export const readme = String.raw`# Ograniczona autoryzacja

Autorski, syntetyczny przykład polityki w jednym procesie. Rust 1.85.0, edition 2024; bez zależności. Uruchom cargo test --offline --locked oraz cargo test --offline --locked --release. Starter ma cztery celowe todo!, a rozwiązanie jest osobnym materiałem pomocy. Pobranie nie jest dowodem niezależnego wykonania.

Właściciel konfiguruje Authority/Service i syntetycznych principal. Publiczny Service::submit sprawdza własną politykę przed przyjęciem do księgi. Authorized zachowuje rzeczywiste &Authority oraz dokładne posiadane Request; nie ma Clone ani publicznego konstruktora. Powtórna autoryzacja jest dozwolona. Aktualizacja replace_grants wymaga zakończenia użycia poprzedniej pożyczki (nie końca leksykalnego bloku). Migawka księgi jest odłączoną kopią.

Kod i testy: MIT; polskie materiały dydaktyczne: CC BY 4.0. Materiał powstał z pomocą AI pod kierunkiem człowieka; nie jest zewnętrznym audytem bezpieczeństwa. Zachowaj cztery dołączone informacje licencyjne.
`;

// CC BY 4.0: original Polish teaching prose.
export const threatModel = String.raw`# Granice modelu

To zaufana konfiguracja polityki w procesie, nie uwierzytelnianie. Publiczny GrantSpec jest danymi, a nie uprawnieniem; znaczenie mają tylko granty zainstalowane przez właściciela. Nie ma parsera tożsamości, TLS, sieci, trwałości, zegara, wygaśnięcia ani rozproszonego odwołania. Kod wewnątrz modułu boundary jest zaufany. Prywatność i ruchy Rust ograniczają bezpiecznych zewnętrznych konsumentów API.

Koszt jest zadeklarowaną liczbą, nie pomiarem pracy ani wielkości payloadu. Limit kosztu nie ogranicza pamięci i CPU. Accepted oznacza przyjęcie do liczników, nie wykonanie, zapis ani dostarczenie. Świadka można porzucić; ponowna autoryzacja nie zapewnia ochrony przed logicznym replay. Ograniczony test skończony nie dowodzi bezpieczeństwa dowolnego wdrożenia.

Materiały: https://doc.rust-lang.org/reference/visibility-and-privacy.html ; https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html ; https://doc.rust-lang.org/std/primitive.u64.html#method.checked_add ; https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html . Reguły polityki są autorskim kontraktem ćwiczenia, nie implementacją standardu OWASP. Opis CC BY 4.0.
`;

// CC BY 4.0: original Polish teaching prose.
export const worksheet = String.raw`# Karta pracy

Zapisz osobno decyzję polityki, osłabienie, związanie żądania i atomowe przyjęcie. Wyjaśnij, dlaczego nie wolno łączyć pól różnych grantów i dlaczego obliczenie dziecka nie usuwa rodzica. Nie traktuj wyboru diagnostyki jako dowodu wykonania kodu.

Ślad konfiguracji: rodzic subject1/tenant10, Tenant, Read+Append, max100. Dziecko: ten sam subject/tenant, resource7, Append, max4. Osłabienie zwraca dokładnie dziecko. Właściciel instaluje je w nowym Service z limitami 10/20. Append resource7 koszt4 jest przyjęte z oryginalnym payloadem; resource8, Read i koszt5 są odrzucone bez zmiany księgi. Próba rozszerzenia dziecka do Tenant jest błędem i nie jest instalowana. Oddzielny serwis z rodzicem nadal przyjmuje resource8, dopóki właściciel jawnie nie zastąpi grantów dzieckiem. Samo obliczenie dziecka nie odwołuje rodzica.

Porównaj odmowę w zamkniętym serwisie z błędem pojemności poprawnie autoryzowanego żądania. Uzasadnij oba sprawdzone dodawania i brak częściowego zapisu. Testy MAX mają prywatne przygotowanie cfg(test); publiczny serwis zawsze zaczyna od zera. Zapisz polecenia, wersje kompilatorów, rzeczywiste wyniki debug/release i granice dowodu. Nie deklaruj uwierzytelniania ani gotowości produkcyjnej. Opis CC BY 4.0.
`;

