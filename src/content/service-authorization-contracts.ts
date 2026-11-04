// MIT: operation-scoped Rust models. Binding uses a labeled expected-argument test double.
export const authorizationOperations = {
  "policy": {
    "canonical": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { // A11-M01
if principal.tenant != request.resource.tenant { return Err(Denial::TenantMismatch); }
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
if allowed { Ok(()) } else { Err(Denial::NoMatchingGrant) } }
}
fn main() {}
`,
    "equivalent": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { if request.resource.tenant != principal.tenant {return Err(Denial::TenantMismatch)}
for g in &self.grants {
 if g.subject != principal.subject || g.tenant != request.resource.tenant {continue}
 match g.scope {Scope::Resource(id) if id != request.resource.id => continue,_=>{}}
 if !g.actions.contains(request.action) || g.max_cost < request.cost {continue}
 return Ok(())
}
Err(Denial::NoMatchingGrant) }
}
fn main() {}
`,
    "starter": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { todo!("implement this operation") }
}
fn main() {}
`,
    "promptScaffold": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { todo!("implement this operation") }
}
fn main() {}
`,
    "tests": String.raw`#[test]
fn authorization_policy_contract() {
let p=Principal {subject:PrincipalId(1),tenant:TenantId(10)};
let q=||Request {resource:Resource {tenant:TenantId(10),id:ResourceId(7)},action:Action::Append,cost:4,payload:"line-α".into()};
let g=GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:4};
let a=Authority::new(vec![g]);assert_eq!(a.decide(p,&q()),Ok(()));
let mut zero=q();zero.cost=0;assert_eq!(a.decide(p,&zero),Ok(()));
let mut over=q();over.cost+=1;assert_eq!(a.decide(p,&over),Err(Denial::NoMatchingGrant));
let mut foreign=q();foreign.resource.tenant=TenantId(99);assert_eq!(a.decide(p,&foreign),Err(Denial::TenantMismatch));
let foreign_p=Principal {tenant:TenantId(99),..p};assert_eq!(a.decide(foreign_p,&foreign),Err(Denial::NoMatchingGrant));
assert_eq!(Authority::new(vec![]).decide(p,&q()),Err(Denial::NoMatchingGrant));
assert_eq!(a.decide(Principal {subject:PrincipalId(99),..p},&q()),Err(Denial::NoMatchingGrant));
assert_eq!(Authority::new(vec![GrantSpec {actions:ActionSet::new(false,false),..g}]).decide(p,&q()),Err(Denial::NoMatchingGrant));
let x=GrantSpec {scope:Scope::Resource(ResourceId(88)),actions:ActionSet::new(true,false),max_cost:0,..g};let y=GrantSpec {subject:PrincipalId(99),..g};
for grants in [vec![x,y],vec![y,x],vec![x,x,y,y]] {assert_eq!(Authority::new(grants).decide(p,&q()),Err(Denial::NoMatchingGrant));}
assert_eq!(Authority::new(vec![g,g,x]).decide(p,&q()),Ok(()));
assert_eq!(Authority::new(vec![GrantSpec {tenant:TenantId(99),..g}]).decide(p,&q()),Err(Denial::NoMatchingGrant));

// Niezależna tabela zakresu: subject, tenant, akcja i koszt są poza zakresem zawsze poprawne.
let resource_policy=Authority::new(vec![GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Resource(ResourceId(7)),actions:ActionSet::new(true,true),max_cost:4}]);
for (resource,action,want) in [(7,Action::Read,Ok(())),(7,Action::Append,Ok(())),(8,Action::Read,Err(Denial::NoMatchingGrant)),(8,Action::Append,Err(Denial::NoMatchingGrant))] {
 let request=Request {resource:Resource {tenant:TenantId(10),id:ResourceId(resource)},action,cost:4,payload:"scope-primary-α".into()};
 assert_eq!(resource_policy.decide(Principal {subject:PrincipalId(1),tenant:TenantId(10)},&request),want);
}
// Każda zamknięta akcja ma osobny dozwolony i odrzucony przypadek przy tym samym zasobie.
let read_only=Authority::new(vec![GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Resource(ResourceId(7)),actions:ActionSet::new(true,false),max_cost:4}]);
let append_only=Authority::new(vec![GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Resource(ResourceId(7)),actions:ActionSet::new(false,true),max_cost:4}]);
for (action,read_want,append_want) in [(Action::Read,Ok(()),Err(Denial::NoMatchingGrant)),(Action::Append,Err(Denial::NoMatchingGrant),Ok(()))] {
 let request=Request {resource:Resource {tenant:TenantId(10),id:ResourceId(7)},action,cost:4,payload:"scope-primary-α".into()};
 let principal=Principal {subject:PrincipalId(1),tenant:TenantId(10)};
 assert_eq!(read_only.decide(principal,&request),read_want);
 assert_eq!(append_only.decide(principal,&request),append_want);
}
}
`,
    "recallTests": String.raw`#[test]
fn authorization_policy_contract_recall() {
let p=Principal {subject:PrincipalId(2),tenant:TenantId(20)};
let q=||Request {resource:Resource {tenant:TenantId(20),id:ResourceId(9)},action:Action::Append,cost:3,payload:"inna-β".into()};
let g=GrantSpec {subject:PrincipalId(2),tenant:TenantId(20),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:3};
let a=Authority::new(vec![g]);assert_eq!(a.decide(p,&q()),Ok(()));
let mut zero=q();zero.cost=0;assert_eq!(a.decide(p,&zero),Ok(()));
let mut over=q();over.cost+=1;assert_eq!(a.decide(p,&over),Err(Denial::NoMatchingGrant));
let mut foreign=q();foreign.resource.tenant=TenantId(99);assert_eq!(a.decide(p,&foreign),Err(Denial::TenantMismatch));
let foreign_p=Principal {tenant:TenantId(99),..p};assert_eq!(a.decide(foreign_p,&foreign),Err(Denial::NoMatchingGrant));
assert_eq!(Authority::new(vec![]).decide(p,&q()),Err(Denial::NoMatchingGrant));
assert_eq!(a.decide(Principal {subject:PrincipalId(99),..p},&q()),Err(Denial::NoMatchingGrant));
assert_eq!(Authority::new(vec![GrantSpec {actions:ActionSet::new(false,false),..g}]).decide(p,&q()),Err(Denial::NoMatchingGrant));
let x=GrantSpec {scope:Scope::Resource(ResourceId(88)),actions:ActionSet::new(true,false),max_cost:0,..g};let y=GrantSpec {subject:PrincipalId(99),..g};
for grants in [vec![x,y],vec![y,x],vec![x,x,y,y]] {assert_eq!(Authority::new(grants).decide(p,&q()),Err(Denial::NoMatchingGrant));}
assert_eq!(Authority::new(vec![g,g,x]).decide(p,&q()),Ok(()));
assert_eq!(Authority::new(vec![GrantSpec {tenant:TenantId(99),..g}]).decide(p,&q()),Err(Denial::NoMatchingGrant));

// Niezależna tabela zakresu: subject, tenant, akcja i koszt są poza zakresem zawsze poprawne.
let resource_policy=Authority::new(vec![GrantSpec {subject:PrincipalId(2),tenant:TenantId(20),scope:Scope::Resource(ResourceId(9)),actions:ActionSet::new(true,true),max_cost:3}]);
for (resource,action,want) in [(9,Action::Read,Ok(())),(9,Action::Append,Ok(())),(12,Action::Read,Err(Denial::NoMatchingGrant)),(12,Action::Append,Err(Denial::NoMatchingGrant))] {
 let request=Request {resource:Resource {tenant:TenantId(20),id:ResourceId(resource)},action,cost:3,payload:"scope-recall-β".into()};
 assert_eq!(resource_policy.decide(Principal {subject:PrincipalId(2),tenant:TenantId(20)},&request),want);
}
// Każda zamknięta akcja ma osobny dozwolony i odrzucony przypadek przy tym samym zasobie.
let read_only=Authority::new(vec![GrantSpec {subject:PrincipalId(2),tenant:TenantId(20),scope:Scope::Resource(ResourceId(9)),actions:ActionSet::new(true,false),max_cost:3}]);
let append_only=Authority::new(vec![GrantSpec {subject:PrincipalId(2),tenant:TenantId(20),scope:Scope::Resource(ResourceId(9)),actions:ActionSet::new(false,true),max_cost:3}]);
for (action,read_want,append_want) in [(Action::Read,Ok(()),Err(Denial::NoMatchingGrant)),(Action::Append,Err(Denial::NoMatchingGrant),Ok(()))] {
 let request=Request {resource:Resource {tenant:TenantId(20),id:ResourceId(9)},action,cost:3,payload:"scope-recall-β".into()};
 let principal=Principal {subject:PrincipalId(2),tenant:TenantId(20)};
 assert_eq!(read_only.decide(principal,&request),read_want);
 assert_eq!(append_only.decide(principal,&request),append_want);
}
}
`,
    "semanticMutants": [
      {
        "name": "tenant-check",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { // A11-M01
if false { return Err(Denial::TenantMismatch); }
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
if allowed { Ok(()) } else { Err(Denial::NoMatchingGrant) } }
}
fn main() {}
`,
        "expectedTest": "authorization_policy_contract"
      },
      {
        "name": "grant-tenant",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { // A11-M01
if principal.tenant != request.resource.tenant { return Err(Denial::TenantMismatch); }
// A11-M03
let allowed = self.grants.iter().any(|grant| {
 grant.subject == principal.subject &&
 // A11-M02
 true &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
});
if allowed { Ok(()) } else { Err(Denial::NoMatchingGrant) } }
}
fn main() {}
`,
        "expectedTest": "authorization_policy_contract"
      },
      {
        "name": "cost-equality",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { // A11-M01
if principal.tenant != request.resource.tenant { return Err(Denial::TenantMismatch); }
// A11-M03
let allowed = self.grants.iter().any(|grant| {
 grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost < grant.max_cost
});
if allowed { Ok(()) } else { Err(Denial::NoMatchingGrant) } }
}
fn main() {}
`,
        "expectedTest": "authorization_policy_contract"
      },
      {
        "name": "resourceScopeIgnored",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { // A11-M01
if principal.tenant != request.resource.tenant { return Err(Denial::TenantMismatch); }
// A11-M03
let allowed = self.grants.iter().any(|grant| {
 grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 true &&
 grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
});
if allowed { Ok(()) } else { Err(Denial::NoMatchingGrant) } }
}
fn main() {}
`,
        "expectedTest": "authorization_policy_contract"
      },
      {
        "name": "rejectAllRead",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {grants:Vec<GrantSpec>}
impl Authority {fn new(grants:Vec<GrantSpec>)->Self {Self {grants}}
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> { // A11-M01
if principal.tenant != request.resource.tenant { return Err(Denial::TenantMismatch); }
// A11-M03
let allowed = self.grants.iter().any(|grant| {
 grant.subject == principal.subject &&
 // A11-M02
 grant.tenant == request.resource.tenant &&
 match grant.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id } &&
 request.action != Action::Read && grant.actions.contains(request.action) &&
 // A11-M04
 request.cost <= grant.max_cost
});
if allowed { Ok(()) } else { Err(Denial::NoMatchingGrant) } }
}
fn main() {}
`,
        "expectedTest": "authorization_policy_contract"
      }
    ]
  },
  "attenuation": {
    "canonical": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok = match (parent.scope,requested.scope) { (Scope::Tenant,_) => true, (Scope::Resource(a),Scope::Resource(b)) => a == b, _ => false };
// A11-M06
let actions_ok = requested.actions.subset_of(parent.actions);
// A11-M07
let cost_ok = requested.max_cost <= parent.max_cost;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(requested) }
fn main() {}
`,
    "equivalent": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { let identity=match (requested.subject==parent.subject,requested.tenant==parent.tenant) {(true,true)=>true,_=>false};
let scope=match parent.scope {Scope::Tenant=>true,Scope::Resource(p)=>match requested.scope {Scope::Resource(c)=>p==c,Scope::Tenant=>false}};
let actions=match (requested.actions.read,requested.actions.append) {(false,false)=>true,(true,false)=>parent.actions.read,(false,true)=>parent.actions.append,(true,true)=>parent.actions.read && parent.actions.append};
let cost=match requested.max_cost.cmp(&parent.max_cost) {std::cmp::Ordering::Greater=>false,_=>true};
if identity && scope && actions && cost {Ok(requested)} else {Err(AttenuationError::WouldAmplify)} }
fn main() {}
`,
    "starter": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { todo!("implement this operation") }
fn main() {}
`,
    "promptScaffold": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { todo!("implement this operation") }
fn main() {}
`,
    "tests": String.raw`#[test]
fn authorization_attenuation_contract() {
let g=GrantSpec {subject:PrincipalId(1),tenant:TenantId(10),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:4};
let child=GrantSpec {scope:Scope::Resource(ResourceId(7)),actions:ActionSet::new(false,true),max_cost:2,..g};
assert_eq!(attenuate(&g,child),Ok(child));
for c in [GrantSpec {subject:PrincipalId(99),..child},GrantSpec {tenant:TenantId(99),..child},GrantSpec {scope:Scope::Tenant,..child},GrantSpec {scope:Scope::Resource(ResourceId(88)),..child},GrantSpec {actions:ActionSet::new(true,true),..child},GrantSpec {max_cost:3,..child}] {assert_eq!(attenuate(&child,c),Err(AttenuationError::WouldAmplify));}
let empty=GrantSpec {actions:ActionSet::new(false,false),max_cost:0,..child};assert_eq!(attenuate(&child,empty),Ok(empty));
assert_eq!(attenuate(&child,child),Ok(child));
// Skończony zbiór żądań jest zapisany jako krotki z dosłownymi oczekiwaniami; nie ma funkcji polityki w modelu.
for (resource,action,cost,want) in [(7,Action::Append,0,true),(7,Action::Append,2,true),(7,Action::Append,3,false),(88,Action::Append,0,false),(7,Action::Read,0,false)] {let permits=child.scope==Scope::Resource(ResourceId(resource)) && child.actions.contains(action) && cost<=child.max_cost;assert_eq!(permits,want);}
}
`,
    "recallTests": String.raw`#[test]
fn authorization_attenuation_contract_recall() {
let g=GrantSpec {subject:PrincipalId(2),tenant:TenantId(20),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:3};
let child=GrantSpec {scope:Scope::Resource(ResourceId(9)),actions:ActionSet::new(false,true),max_cost:2,..g};
assert_eq!(attenuate(&g,child),Ok(child));
for c in [GrantSpec {subject:PrincipalId(99),..child},GrantSpec {tenant:TenantId(99),..child},GrantSpec {scope:Scope::Tenant,..child},GrantSpec {scope:Scope::Resource(ResourceId(88)),..child},GrantSpec {actions:ActionSet::new(true,true),..child},GrantSpec {max_cost:3,..child}] {assert_eq!(attenuate(&child,c),Err(AttenuationError::WouldAmplify));}
let empty=GrantSpec {actions:ActionSet::new(false,false),max_cost:0,..child};assert_eq!(attenuate(&child,empty),Ok(empty));
assert_eq!(attenuate(&child,child),Ok(child));
// Skończony zbiór żądań jest zapisany jako krotki z dosłownymi oczekiwaniami; nie ma funkcji polityki w modelu.
for (resource,action,cost,want) in [(9,Action::Append,0,true),(9,Action::Append,2,true),(9,Action::Append,3,false),(88,Action::Append,0,false),(9,Action::Read,0,false)] {let permits=child.scope==Scope::Resource(ResourceId(resource)) && child.actions.contains(action) && cost<=child.max_cost;assert_eq!(permits,want);}
}
`,
    "semanticMutants": [
      {
        "name": "scope-widening",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok=true;
// A11-M06
let actions_ok = requested.actions.subset_of(parent.actions);
// A11-M07
let cost_ok = requested.max_cost <= parent.max_cost;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(requested) }
fn main() {}
`,
        "expectedTest": "authorization_attenuation_contract"
      },
      {
        "name": "actions-widening",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok = match (parent.scope,requested.scope) { (Scope::Tenant,_) => true, (Scope::Resource(a),Scope::Resource(b)) => a == b, _ => false };
// A11-M06
let actions_ok = true;
// A11-M07
let cost_ok = requested.max_cost <= parent.max_cost;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(requested) }
fn main() {}
`,
        "expectedTest": "authorization_attenuation_contract"
      },
      {
        "name": "cost-widening",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok = match (parent.scope,requested.scope) { (Scope::Tenant,_) => true, (Scope::Resource(a),Scope::Resource(b)) => a == b, _ => false };
// A11-M06
let actions_ok = requested.actions.subset_of(parent.actions);
// A11-M07
let cost_ok = true;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(requested) }
fn main() {}
`,
        "expectedTest": "authorization_attenuation_contract"
      },
      {
        "name": "return-parent",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok = match (parent.scope,requested.scope) { (Scope::Tenant,_) => true, (Scope::Resource(a),Scope::Resource(b)) => a == b, _ => false };
// A11-M06
let actions_ok = requested.actions.subset_of(parent.actions);
// A11-M07
let cost_ok = requested.max_cost <= parent.max_cost;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(*parent) }
fn main() {}
`,
        "expectedTest": "authorization_attenuation_contract"
      }
    ]
  },
  "binding": {
    "canonical": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>}
impl Authority {
fn fixture(expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>)->Self {Self {expected_principal,expected_request,decision}}
// Deterministyczny dubler testowy: sprawdza wyłącznie równość ustalonych argumentów, nie politykę uprawnień.
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {
 if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }
}
fn authorize<'a>(&'a self,principal:Principal,request:Request)->Result<Authorized<'a>,Denial> { self.decide(principal,&request)?;
Ok(Authorized { authority:self,
 // A11-M11
 principal,
 // A11-M10
 request
}) }
}
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
impl Authorized<'_> {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
fn main() {}
`,
    "equivalent": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>}
impl Authority {
fn fixture(expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>)->Self {Self {expected_principal,expected_request,decision}}
// Deterministyczny dubler testowy: sprawdza wyłącznie równość ustalonych argumentów, nie politykę uprawnień.
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {
 if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }
}
fn authorize<'a>(&'a self,principal:Principal,request:Request)->Result<Authorized<'a>,Denial> { match self.decide(principal,&request) {Ok(())=>Ok(Authorized {authority:self,principal,request}),Err(reason)=>Err(reason)} }
}
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
impl Authorized<'_> {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
fn main() {}
`,
    "starter": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>}
impl Authority {
fn fixture(expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>)->Self {Self {expected_principal,expected_request,decision}}
// Deterministyczny dubler testowy: sprawdza wyłącznie równość ustalonych argumentów, nie politykę uprawnień.
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {
 if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }
}
fn authorize<'a>(&'a self,principal:Principal,request:Request)->Result<Authorized<'a>,Denial> { todo!("implement this operation") }
}
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
impl Authorized<'_> {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
fn main() {}
`,
    "promptScaffold": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>}
impl Authority {
fn fixture(expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>)->Self {Self {expected_principal,expected_request,decision}}
// Deterministyczny dubler testowy: sprawdza wyłącznie równość ustalonych argumentów, nie politykę uprawnień.
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {
 if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }
}
fn authorize<'a>(&'a self,principal:Principal,request:Request)->Result<Authorized<'a>,Denial> { todo!("implement this operation") }
}
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
impl Authorized<'_> {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
fn main() {}
`,
    "tests": String.raw`#[test]
fn authorization_binding_contract() {
let p=Principal {subject:PrincipalId(1),tenant:TenantId(10)};
let q=||Request {resource:Resource {tenant:TenantId(10),id:ResourceId(7)},action:Action::Append,cost:4,payload:"line-α".into()};
for decision in [Ok(()),Err(Denial::TenantMismatch),Err(Denial::NoMatchingGrant)] {
 let a=Authority::fixture(p,q(),decision);
 match (a.authorize(p,q()),decision) {(Ok(w),Ok(()))=>{assert_eq!(w.principal(),p);assert_eq!(w.request(),&q());assert!(std::ptr::eq(w.authority,&a));},(Err(got),Err(want))=>assert_eq!(got,want),_=>assert!(false)}
}
let a=Authority::fixture(p,q(),Ok(()));
assert_eq!(a.authorize(Principal {subject:PrincipalId(99),..p},q()).unwrap_err(),Denial::NoMatchingGrant);
for field in 0..4 {let mut altered=q();match field {0=>altered.resource.id=ResourceId(88),1=>altered.action=Action::Read,2=>altered.cost+=1,_=>altered.payload.push('!')};assert_eq!(a.authorize(p,altered).unwrap_err(),Denial::NoMatchingGrant);}
// Drugi zestaw niezależnych literałów wykrywa związanie zastępczego principala/żądania.
let p2=Principal {subject:PrincipalId(42),tenant:TenantId(30)};let q2=||Request {resource:Resource {tenant:TenantId(30),id:ResourceId(12)},action:Action::Read,cost:2,payload:"Ω-dwa".into()};let a2=Authority::fixture(p2,q2(),Ok(()));let w=a2.authorize(p2,q2()).unwrap();assert_eq!(w.principal(),p2);assert_eq!(w.request(),&q2());
}
`,
    "recallTests": String.raw`#[test]
fn authorization_binding_contract_recall() {
let p=Principal {subject:PrincipalId(2),tenant:TenantId(20)};
let q=||Request {resource:Resource {tenant:TenantId(20),id:ResourceId(9)},action:Action::Append,cost:3,payload:"inna-β".into()};
for decision in [Ok(()),Err(Denial::TenantMismatch),Err(Denial::NoMatchingGrant)] {
 let a=Authority::fixture(p,q(),decision);
 match (a.authorize(p,q()),decision) {(Ok(w),Ok(()))=>{assert_eq!(w.principal(),p);assert_eq!(w.request(),&q());assert!(std::ptr::eq(w.authority,&a));},(Err(got),Err(want))=>assert_eq!(got,want),_=>assert!(false)}
}
let a=Authority::fixture(p,q(),Ok(()));
assert_eq!(a.authorize(Principal {subject:PrincipalId(99),..p},q()).unwrap_err(),Denial::NoMatchingGrant);
for field in 0..4 {let mut altered=q();match field {0=>altered.resource.id=ResourceId(88),1=>altered.action=Action::Read,2=>altered.cost+=1,_=>altered.payload.push('!')};assert_eq!(a.authorize(p,altered).unwrap_err(),Denial::NoMatchingGrant);}
// Drugi zestaw niezależnych literałów wykrywa związanie zastępczego principala/żądania.
let p2=Principal {subject:PrincipalId(42),tenant:TenantId(30)};let q2=||Request {resource:Resource {tenant:TenantId(30),id:ResourceId(12)},action:Action::Read,cost:2,payload:"Ω-dwa".into()};let a2=Authority::fixture(p2,q2(),Ok(()));let w=a2.authorize(p2,q2()).unwrap();assert_eq!(w.principal(),p2);assert_eq!(w.request(),&q2());
}
`,
    "semanticMutants": [
      {
        "name": "empty-payload",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>}
impl Authority {
fn fixture(expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>)->Self {Self {expected_principal,expected_request,decision}}
// Deterministyczny dubler testowy: sprawdza wyłącznie równość ustalonych argumentów, nie politykę uprawnień.
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {
 if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }
}
fn authorize<'a>(&'a self,principal:Principal,request:Request)->Result<Authorized<'a>,Denial> { self.decide(principal,&request)?;
Ok(Authorized { authority:self,
 // A11-M11
 principal,
 // A11-M10
 request:Request {payload:String::new(),..request}
}) }
}
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
impl Authorized<'_> {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
fn main() {}
`,
        "expectedTest": "authorization_binding_contract"
      },
      {
        "name": "principal-zero",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>}
impl Authority {
fn fixture(expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>)->Self {Self {expected_principal,expected_request,decision}}
// Deterministyczny dubler testowy: sprawdza wyłącznie równość ustalonych argumentów, nie politykę uprawnień.
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {
 if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }
}
fn authorize<'a>(&'a self,principal:Principal,request:Request)->Result<Authorized<'a>,Denial> { self.decide(principal,&request)?;
Ok(Authorized { authority:self,
 // A11-M11
 principal:Principal {subject:PrincipalId(0),tenant:principal.tenant},
 // A11-M10
 request
}) }
}
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
impl Authorized<'_> {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
fn main() {}
`,
        "expectedTest": "authorization_binding_contract"
      },
      {
        "name": "skip-dependency",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>}
impl Authority {
fn fixture(expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>)->Self {Self {expected_principal,expected_request,decision}}
// Deterministyczny dubler testowy: sprawdza wyłącznie równość ustalonych argumentów, nie politykę uprawnień.
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {
 if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }
}
fn authorize<'a>(&'a self,principal:Principal,request:Request)->Result<Authorized<'a>,Denial> { 
Ok(Authorized { authority:self,
 // A11-M11
 principal,
 // A11-M10
 request
}) }
}
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
impl Authorized<'_> {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
fn main() {}
`,
        "expectedTest": "authorization_binding_contract"
      },
      {
        "name": "altered-dependency-args",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial {TenantMismatch,NoMatchingGrant}
#[derive(Debug)] struct Authority {expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>}
impl Authority {
fn fixture(expected_principal:Principal,expected_request:Request,decision:Result<(),Denial>)->Self {Self {expected_principal,expected_request,decision}}
// Deterministyczny dubler testowy: sprawdza wyłącznie równość ustalonych argumentów, nie politykę uprawnień.
fn decide(&self,principal:Principal,request:&Request)->Result<(),Denial> {
 if principal == self.expected_principal && request == &self.expected_request { self.decision } else { Err(Denial::NoMatchingGrant) }
}
fn authorize<'a>(&'a self,principal:Principal,request:Request)->Result<Authorized<'a>,Denial> { self.decide(Principal {subject:PrincipalId(0),..principal},&request)?;
Ok(Authorized { authority:self,
 // A11-M11
 principal,
 // A11-M10
 request
}) }
}
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
impl Authorized<'_> {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
fn main() {}
`,
        "expectedTest": "authorization_binding_contract"
      }
    ]
  },
  "admission": {
    "canonical": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
// Candidates remain local until both checks succeed.
// A11-M16
let next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?;
// A11-M14
if next_cost > state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
    "equivalent": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { let Authorized {authority:_authority,principal,request}=authorized;
if !state.accepting {return Err(AdmissionRejection::Closed)}
let accepted=match state.accepted.checked_add(1) {Some(n)=>n,None=>return Err(AdmissionRejection::CounterOverflow)};
if state.limits.max_accepted < accepted {return Err(AdmissionRejection::Capacity)}
let charged=match state.charged_cost.checked_add(request.cost) {Some(n)=>n,None=>return Err(AdmissionRejection::CounterOverflow)};
if state.limits.max_cost < charged {return Err(AdmissionRejection::CostBudget)}
*state=AdmissionState {accepting:state.accepting,accepted,charged_cost:charged,limits:state.limits};
Ok(Accepted {principal,request}) }
fn main() {}
`,
    "starter": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { todo!("implement this operation") }
fn main() {}
`,
    "promptScaffold": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { todo!("implement this operation") }
fn main() {}
`,
    "tests": String.raw`#[test]
fn authorization_admission_contract() {
let p=Principal {subject:PrincipalId(1),tenant:TenantId(10)};
let q=||Request {resource:Resource {tenant:TenantId(10),id:ResourceId(7)},action:Action::Append,cost:4,payload:"line-α".into()};
// Authority i Authorized są ustalonym wejściem testowym, nie dowodem wcześniejszej autoryzacji.
let a=Authority;let w=||Authorized {authority:&a,principal:p,request:q()};
let mut s=AdmissionState {accepting:true,accepted:0,charged_cost:0,limits:Limits {max_accepted:2,max_cost:q().cost}};
let result=admit(w(),&mut s);assert!(result.is_ok());let record=result.unwrap();assert_eq!(record.principal(),p);assert_eq!(record.request(),&q());assert_eq!((s.accepted,s.charged_cost),(1,q().cost));
let before=(s.accepted,s.charged_cost);assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::CostBudget));assert_eq!((s.accepted,s.charged_cost),before);
let mut zero=q();zero.cost=0;assert!(admit(Authorized {authority:&a,principal:p,request:zero},&mut s).is_ok());
assert_eq!((s.accepted,s.charged_cost),(2,q().cost));assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::Capacity));assert_eq!((s.accepted,s.charged_cost),(2,q().cost));
s.accepting=false;assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::Closed));assert_eq!((s.accepted,s.charged_cost),(2,q().cost));
for (accepted,charged,cost) in [(u64::MAX,0,0),(0,u64::MAX,1)] {let mut s=AdmissionState {accepting:true,accepted,charged_cost:charged,limits:Limits {max_accepted:u64::MAX,max_cost:u64::MAX}};let mut request=q();request.cost=cost;assert_eq!(admit(Authorized {authority:&a,principal:p,request},&mut s),Err(AdmissionRejection::CounterOverflow));assert_eq!((s.accepted,s.charged_cost),(accepted,charged));}
}
`,
    "recallTests": String.raw`#[test]
fn authorization_admission_contract_recall() {
let p=Principal {subject:PrincipalId(2),tenant:TenantId(20)};
let q=||Request {resource:Resource {tenant:TenantId(20),id:ResourceId(9)},action:Action::Append,cost:3,payload:"inna-β".into()};
// Authority i Authorized są ustalonym wejściem testowym, nie dowodem wcześniejszej autoryzacji.
let a=Authority;let w=||Authorized {authority:&a,principal:p,request:q()};
let mut s=AdmissionState {accepting:true,accepted:0,charged_cost:0,limits:Limits {max_accepted:2,max_cost:q().cost}};
let result=admit(w(),&mut s);assert!(result.is_ok());let record=result.unwrap();assert_eq!(record.principal(),p);assert_eq!(record.request(),&q());assert_eq!((s.accepted,s.charged_cost),(1,q().cost));
let before=(s.accepted,s.charged_cost);assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::CostBudget));assert_eq!((s.accepted,s.charged_cost),before);
let mut zero=q();zero.cost=0;assert!(admit(Authorized {authority:&a,principal:p,request:zero},&mut s).is_ok());
assert_eq!((s.accepted,s.charged_cost),(2,q().cost));assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::Capacity));assert_eq!((s.accepted,s.charged_cost),(2,q().cost));
s.accepting=false;assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::Closed));assert_eq!((s.accepted,s.charged_cost),(2,q().cost));
for (accepted,charged,cost) in [(u64::MAX,0,0),(0,u64::MAX,1)] {let mut s=AdmissionState {accepting:true,accepted,charged_cost:charged,limits:Limits {max_accepted:u64::MAX,max_cost:u64::MAX}};let mut request=q();request.cost=cost;assert_eq!(admit(Authorized {authority:&a,principal:p,request},&mut s),Err(AdmissionRejection::CounterOverflow));assert_eq!((s.accepted,s.charged_cost),(accepted,charged));}
}
`,
    "semanticMutants": [
      {
        "name": "partial-ledger-write",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
state.accepted=next_accepted;
// A11-M16
let next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?;
// A11-M14
if next_cost > state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
        "expectedTest": "authorization_admission_contract"
      },
      {
        "name": "budget-equality",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
// Candidates remain local until both checks succeed.
// A11-M16
let next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?;
// A11-M14
if next_cost >= state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
        "expectedTest": "authorization_admission_contract"
      },
      {
        "name": "accepted-wrap",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.wrapping_add(1);
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
// Candidates remain local until both checks succeed.
// A11-M16
let next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?;
// A11-M14
if next_cost > state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
        "expectedTest": "authorization_admission_contract"
      },
      {
        "name": "charged-wrap",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
// Candidates remain local until both checks succeed.
// A11-M16
let next_cost = state.charged_cost.wrapping_add(request.cost);
// A11-M14
if next_cost > state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
        "expectedTest": "authorization_admission_contract"
      }
    ]
  }
} as const;

export const authorizationOrdinaryReviews = {
  "scopedAuthority": {
    "canonical": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok = match (parent.scope,requested.scope) { (Scope::Tenant,_) => true, (Scope::Resource(a),Scope::Resource(b)) => a == b, _ => false };
// A11-M06
let actions_ok = requested.actions.subset_of(parent.actions);
// A11-M07
let cost_ok = requested.max_cost <= parent.max_cost;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(requested) }
fn main() {}
`,
    "equivalent": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { let identity=match (requested.subject==parent.subject,requested.tenant==parent.tenant) {(true,true)=>true,_=>false};
let scope=match parent.scope {Scope::Tenant=>true,Scope::Resource(p)=>match requested.scope {Scope::Resource(c)=>p==c,Scope::Tenant=>false}};
let actions=match (requested.actions.read,requested.actions.append) {(false,false)=>true,(true,false)=>parent.actions.read,(false,true)=>parent.actions.append,(true,true)=>parent.actions.read && parent.actions.append};
let cost=match requested.max_cost.cmp(&parent.max_cost) {std::cmp::Ordering::Greater=>false,_=>true};
if identity && scope && actions && cost {Ok(requested)} else {Err(AttenuationError::WouldAmplify)} }
fn main() {}
`,
    "starter": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { todo!("implement this operation") }
fn main() {}
`,
    "promptScaffold": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { todo!("implement this operation") }
fn main() {}
`,
    "tests": String.raw`#[test]
fn authorization_scoped_review() {
let g=GrantSpec {subject:PrincipalId(2),tenant:TenantId(20),scope:Scope::Tenant,actions:ActionSet::new(true,true),max_cost:3};
let child=GrantSpec {scope:Scope::Resource(ResourceId(9)),actions:ActionSet::new(false,true),max_cost:2,..g};
assert_eq!(attenuate(&g,child),Ok(child));
for c in [GrantSpec {subject:PrincipalId(99),..child},GrantSpec {tenant:TenantId(99),..child},GrantSpec {scope:Scope::Tenant,..child},GrantSpec {scope:Scope::Resource(ResourceId(88)),..child},GrantSpec {actions:ActionSet::new(true,true),..child},GrantSpec {max_cost:3,..child}] {assert_eq!(attenuate(&child,c),Err(AttenuationError::WouldAmplify));}
let empty=GrantSpec {actions:ActionSet::new(false,false),max_cost:0,..child};assert_eq!(attenuate(&child,empty),Ok(empty));
assert_eq!(attenuate(&child,child),Ok(child));
// Skończony zbiór żądań jest zapisany jako krotki z dosłownymi oczekiwaniami; nie ma funkcji polityki w modelu.
for (resource,action,cost,want) in [(9,Action::Append,0,true),(9,Action::Append,2,true),(9,Action::Append,3,false),(88,Action::Append,0,false),(9,Action::Read,0,false)] {let permits=child.scope==Scope::Resource(ResourceId(resource)) && child.actions.contains(action) && cost<=child.max_cost;assert_eq!(permits,want);}
}
`,
    "semanticMutants": [
      {
        "name": "scope-widening",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok=true;
// A11-M06
let actions_ok = requested.actions.subset_of(parent.actions);
// A11-M07
let cost_ok = requested.max_cost <= parent.max_cost;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(requested) }
fn main() {}
`,
        "expectedTest": "authorization_scoped_review"
      },
      {
        "name": "actions-widening",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok = match (parent.scope,requested.scope) { (Scope::Tenant,_) => true, (Scope::Resource(a),Scope::Resource(b)) => a == b, _ => false };
// A11-M06
let actions_ok = true;
// A11-M07
let cost_ok = requested.max_cost <= parent.max_cost;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(requested) }
fn main() {}
`,
        "expectedTest": "authorization_scoped_review"
      },
      {
        "name": "cost-widening",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok = match (parent.scope,requested.scope) { (Scope::Tenant,_) => true, (Scope::Resource(a),Scope::Resource(b)) => a == b, _ => false };
// A11-M06
let actions_ok = requested.actions.subset_of(parent.actions);
// A11-M07
let cost_ok = true;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(requested) }
fn main() {}
`,
        "expectedTest": "authorization_scoped_review"
      },
      {
        "name": "return-parent",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope {Tenant,Resource(ResourceId)}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet {read:bool,append:bool}
impl ActionSet {const fn new(read:bool,append:bool)->Self {Self {read,append}} fn contains(self,action:Action)->bool {match action {Action::Read=>self.read,Action::Append=>self.append}} fn subset_of(self,parent:Self)->bool {(!self.read || parent.read) && (!self.append || parent.append)}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec {subject:PrincipalId,tenant:TenantId,scope:Scope,actions:ActionSet,max_cost:u64}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError {WouldAmplify}
fn attenuate(parent:&GrantSpec,requested:GrantSpec)->Result<GrantSpec,AttenuationError> { // A11-M05
let scope_ok = match (parent.scope,requested.scope) { (Scope::Tenant,_) => true, (Scope::Resource(a),Scope::Resource(b)) => a == b, _ => false };
// A11-M06
let actions_ok = requested.actions.subset_of(parent.actions);
// A11-M07
let cost_ok = requested.max_cost <= parent.max_cost;
if requested.subject != parent.subject || requested.tenant != parent.tenant || !scope_ok || !actions_ok || !cost_ok { return Err(AttenuationError::WouldAmplify); }
// A11-M08
Ok(*parent) }
fn main() {}
`,
        "expectedTest": "authorization_scoped_review"
      }
    ]
  },
  "boundUse": {
    "canonical": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
// Candidates remain local until both checks succeed.
// A11-M16
let next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?;
// A11-M14
if next_cost > state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
    "equivalent": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { let Authorized {authority:_authority,principal,request}=authorized;
if !state.accepting {return Err(AdmissionRejection::Closed)}
let accepted=match state.accepted.checked_add(1) {Some(n)=>n,None=>return Err(AdmissionRejection::CounterOverflow)};
if state.limits.max_accepted < accepted {return Err(AdmissionRejection::Capacity)}
let charged=match state.charged_cost.checked_add(request.cost) {Some(n)=>n,None=>return Err(AdmissionRejection::CounterOverflow)};
if state.limits.max_cost < charged {return Err(AdmissionRejection::CostBudget)}
*state=AdmissionState {accepting:state.accepting,accepted,charged_cost:charged,limits:state.limits};
Ok(Accepted {principal,request}) }
fn main() {}
`,
    "starter": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { todo!("implement this operation") }
fn main() {}
`,
    "promptScaffold": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { todo!("implement this operation") }
fn main() {}
`,
    "tests": String.raw`#[test]
fn authorization_bound_use_review() {
let p=Principal {subject:PrincipalId(2),tenant:TenantId(20)};
let q=||Request {resource:Resource {tenant:TenantId(20),id:ResourceId(9)},action:Action::Append,cost:3,payload:"inna-β".into()};
// Authority i Authorized są ustalonym wejściem testowym, nie dowodem wcześniejszej autoryzacji.
let a=Authority;let w=||Authorized {authority:&a,principal:p,request:q()};
let mut s=AdmissionState {accepting:true,accepted:0,charged_cost:0,limits:Limits {max_accepted:2,max_cost:q().cost}};
let result=admit(w(),&mut s);assert!(result.is_ok());let record=result.unwrap();assert_eq!(record.principal(),p);assert_eq!(record.request(),&q());assert_eq!((s.accepted,s.charged_cost),(1,q().cost));
let before=(s.accepted,s.charged_cost);assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::CostBudget));assert_eq!((s.accepted,s.charged_cost),before);
let mut zero=q();zero.cost=0;assert!(admit(Authorized {authority:&a,principal:p,request:zero},&mut s).is_ok());
assert_eq!((s.accepted,s.charged_cost),(2,q().cost));assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::Capacity));assert_eq!((s.accepted,s.charged_cost),(2,q().cost));
s.accepting=false;assert_eq!(admit(w(),&mut s),Err(AdmissionRejection::Closed));assert_eq!((s.accepted,s.charged_cost),(2,q().cost));
for (accepted,charged,cost) in [(u64::MAX,0,0),(0,u64::MAX,1)] {let mut s=AdmissionState {accepting:true,accepted,charged_cost:charged,limits:Limits {max_accepted:u64::MAX,max_cost:u64::MAX}};let mut request=q();request.cost=cost;assert_eq!(admit(Authorized {authority:&a,principal:p,request},&mut s),Err(AdmissionRejection::CounterOverflow));assert_eq!((s.accepted,s.charged_cost),(accepted,charged));}
}
`,
    "semanticMutants": [
      {
        "name": "partial-ledger-write",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
state.accepted=next_accepted;
// A11-M16
let next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?;
// A11-M14
if next_cost > state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
        "expectedTest": "authorization_bound_use_review"
      },
      {
        "name": "budget-equality",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
// Candidates remain local until both checks succeed.
// A11-M16
let next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?;
// A11-M14
if next_cost >= state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
        "expectedTest": "authorization_bound_use_review"
      },
      {
        "name": "accepted-wrap",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.wrapping_add(1);
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
// Candidates remain local until both checks succeed.
// A11-M16
let next_cost = state.charged_cost.checked_add(request.cost).ok_or(CounterOverflow)?;
// A11-M14
if next_cost > state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
        "expectedTest": "authorization_bound_use_review"
      },
      {
        "name": "charged-wrap",
        "source": String.raw`#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action {Read,Append}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal {subject:PrincipalId,tenant:TenantId}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource {tenant:TenantId,id:ResourceId}
#[derive(Debug,PartialEq,Eq)] struct Request {resource:Resource,action:Action,cost:u64,payload:String}
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> {authority:&'a Authority,principal:Principal,request:Request}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Limits {max_accepted:u64,max_cost:u64}
#[derive(Debug)] struct AdmissionState {accepting:bool,accepted:u64,charged_cost:u64,limits:Limits}
#[derive(Debug,PartialEq,Eq)] struct Accepted {principal:Principal,request:Request}
impl Accepted {fn principal(&self)->Principal {self.principal} fn request(&self)->&Request {&self.request}}
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AdmissionRejection {Closed,Capacity,CostBudget,CounterOverflow}
fn admit(authorized:Authorized<'_>,state:&mut AdmissionState)->Result<Accepted,AdmissionRejection> { use AdmissionRejection::*;
let Authorized { authority:_authority,principal,request } = authorized;
if !state.accepting { return Err(Closed); }
// A11-M15
let next_accepted = state.accepted.checked_add(1).ok_or(CounterOverflow)?;
if next_accepted > state.limits.max_accepted { return Err(Capacity); }
// A11-M13
// Candidates remain local until both checks succeed.
// A11-M16
let next_cost = state.charged_cost.wrapping_add(request.cost);
// A11-M14
if next_cost > state.limits.max_cost { return Err(CostBudget); }
state.accepted=next_accepted;
state.charged_cost=next_cost;
Ok(Accepted {principal,request}) }
fn main() {}
`,
        "expectedTest": "authorization_bound_use_review"
      }
    ]
  }
} as const;

