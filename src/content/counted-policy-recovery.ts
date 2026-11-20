// MIT: fixed operational models. Original Polish teaching prose: CC BY 4.0.
import type { LessonStep } from "../domain/types";

const identityModel = `#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct PrincipalId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct TenantId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ResourceId(u64);
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Action { Read, Append }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Principal { subject: PrincipalId, tenant: TenantId }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct Resource { tenant: TenantId, id: ResourceId }
#[derive(Debug,PartialEq,Eq)] struct Request { resource: Resource, action: Action, cost: u64, payload: String }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Scope { Tenant, Resource(ResourceId) }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct ActionSet { read: bool, append: bool }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct GrantSpec { subject: PrincipalId, tenant: TenantId, scope: Scope, actions: ActionSet, max_cost: u64 }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Denial { TenantMismatch, NoMatchingGrant }
`;
function program(model: string, signature: string, body: string) {
  return `${model}\n${signature} {\n${body}\n}\nfn main() {}\n`;
}
function task(
  id: string,
  concept: string,
  family: string,
  title: string,
  prompt: string,
  model: string,
  signature: string,
  body: string,
  tests: string,
): LessonStep {
  return {
    id,
    kind: "apply",
    title,
    prompt,
    code: program(model, signature, '    todo!("uzupełnij operację")'),
    solution: program(model, signature, body),
    evaluator: { kind: "tests", tests },
    expectedStatus: "success",
    evidenceKind: "transfer",
    evidenceGate: true,
    evidence: { version: 2, conceptIds: [concept], codingTaskId: family },
  };
}

const matching = task(
  "authorization-policy-matching-indexes",
  "service-scoped-authority",
  "service-authorization/matching-indexes-v1",
  "Zachowaj wszystkie pełne dopasowania grantu",
  "Napisz matching_grants(principal, request, grants) -> Vec<usize>. Zwróć indeksy WSZYSTKICH grantów, które każdy osobno pokrywają subject, tenant, zakres zasobu, akcję i cost <= max_cost. Zachowaj kolejność i duplikaty grantów jako osobne indeksy. Tenant żądania różny od tenanta principal daje pustą listę. Tenant scope dopuszcza każdy zasób tego tenanta, Resource tylko wskazany id. Pusty zbiór akcji nie pasuje, koszt równy zero oraz równość limitu są poprawne. Nie składaj pól z różnych grantów i nie kończ po pierwszym dopasowaniu. To audyt indeksów polityki, nie uwierzytelnienie ani dowód bezpieczeństwa wdrożenia.",
  identityModel,
  "fn matching_grants(principal: Principal, request: &Request, grants: &[GrantSpec]) -> Vec<usize>",
  `    let mut indexes = Vec::new();
    if principal.tenant != request.resource.tenant { return indexes; }
    for (index,g) in grants.iter().enumerate() {
        let scope_matches = match g.scope { Scope::Tenant => true, Scope::Resource(id) => id == request.resource.id };
        let action_matches = match request.action { Action::Read => g.actions.read, Action::Append => g.actions.append };
        if g.subject == principal.subject && g.tenant == principal.tenant && scope_matches && action_matches && request.cost <= g.max_cost {
            indexes.push(index);
        }
    }
    indexes`,
  `#[test]
fn indexes_are_complete_ordered_and_each_grant_is_whole() {
    let p=Principal {subject:PrincipalId(3),tenant:TenantId(8)};
    let q=Request {resource:Resource {tenant:p.tenant,id:ResourceId(7)},action:Action::Append,cost:4,payload:"  żółw🦀 ".into()};
    let g=GrantSpec {subject:p.subject,tenant:p.tenant,scope:Scope::Tenant,actions:ActionSet {read:true,append:true},max_cost:4};
    let wrong=GrantSpec {subject:PrincipalId(99),..g};
    assert_eq!(matching_grants(p,&q,&[wrong,g,wrong,g]),vec![1,3]);
    assert_eq!(matching_grants(p,&q,&[g,g,g]),vec![0,1,2]);
    assert_eq!(matching_grants(p,&q,&[]),Vec::<usize>::new());
    for invalid in [wrong, GrantSpec {tenant:TenantId(99),..g},GrantSpec {scope:Scope::Resource(ResourceId(99)),..g},GrantSpec {actions:ActionSet {read:true,append:false},..g},GrantSpec {max_cost:3,..g}] {
        assert!(matching_grants(p,&q,&[invalid]).is_empty());
    }
    assert_eq!(matching_grants(p,&q,&[GrantSpec {scope:Scope::Resource(ResourceId(7)),..g}]),vec![0]);
    let read=Request {action:Action::Read,..q};
    assert_eq!(matching_grants(p,&read,&[GrantSpec {actions:ActionSet {read:true,append:false},..g}]),vec![0]);
    assert!(matching_grants(p,&read,&[GrantSpec {actions:ActionSet {read:false,append:true},..g}]).is_empty());
    assert!(matching_grants(Principal {tenant:TenantId(99),..p},&read,&[g]).is_empty());
    let zero=Request {cost:0,..read};
    assert_eq!(matching_grants(p,&zero,&[GrantSpec {max_cost:0,..g}]),vec![0]);
    assert!(matching_grants(p,&zero,&[GrantSpec {actions:ActionSet {read:false,append:false},..g}]).is_empty());
    let partial=GrantSpec {actions:ActionSet {read:false,append:false},..g};
    assert!(matching_grants(p,&zero,&[partial,wrong]).is_empty());
    assert_eq!(zero.payload,"  żółw🦀 ");
}`,
);

const intersection = task(
  "authorization-attenuation-intersection",
  "service-scoped-authority",
  "service-authorization/grant-intersection-v1",
  "Sprawdź cały pakiet żądanych ograniczeń",
  "Napisz restrict_many(parent, requested) -> Vec<Result<GrantSpec, AttenuationError>>. Każde żądane ograniczenie (child) sprawdź osobno i zachowaj kolejność, liczbę oraz wszystkie odmowy w wyniku. Poprawny grant potomny musi zachować subject i tenant grantu nadrzędnego, zawężać zakres (Tenant do dowolnego zasobu, Resource tylko do tego samego Resource), zawierać wyłącznie akcje grantu nadrzędnego i mieć max_cost nie większy niż jego limit. Zwróć dokładnie żądany grant potomny albo Err(WouldAmplify). Nie przycinaj kosztu, akcji ani zakresu i nie zastępuj go grantem nadrzędnym; także przy jednym błędzie sprawdź kolejne żądania. Pusty pakiet daje pusty wynik. Puste akcje i limit równy zero są dozwolonym ograniczeniem. To pakiet jawnych decyzji ograniczenia uprawnień, bez instalowania polityki i bez uwierzytelnienia.",
  identityModel +
    "#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum AttenuationError { WouldAmplify }\n",
  "fn restrict_many(parent: &GrantSpec, requested: &[GrantSpec]) -> Vec<Result<GrantSpec, AttenuationError>>",
  `    requested.iter().map(|requested| {
        let scope_ok = match (parent.scope, requested.scope) {
            (Scope::Tenant, _) => true,
            (Scope::Resource(a), Scope::Resource(b)) => a == b,
            _ => false,
        };
        let actions_ok = (!requested.actions.read || parent.actions.read) && (!requested.actions.append || parent.actions.append);
        if requested.subject == parent.subject && requested.tenant == parent.tenant && scope_ok && actions_ok && requested.max_cost <= parent.max_cost {
            Ok(*requested)
        } else {
            Err(AttenuationError::WouldAmplify)
        }
    }).collect()`,
  `#[test]
fn requested_batch_retains_every_exact_child_or_amplification_denial() {
    let parent=GrantSpec {subject:PrincipalId(1),tenant:TenantId(2),scope:Scope::Tenant,actions:ActionSet {read:true,append:true},max_cost:50};
    let narrow=GrantSpec {scope:Scope::Resource(ResourceId(3)),actions:ActionSet {read:false,append:true},max_cost:4,..parent};
    let empty=GrantSpec {actions:ActionSet {read:false,append:false},max_cost:0,..narrow};
    let expensive=GrantSpec {max_cost:51,..parent};
    assert_eq!(restrict_many(&parent,&[narrow,expensive,parent,empty,narrow]),vec![Ok(narrow),Err(AttenuationError::WouldAmplify),Ok(parent),Ok(empty),Ok(narrow)]);
    assert_eq!(restrict_many(&parent,&[]),vec![]);
    let mismatches=[GrantSpec {subject:PrincipalId(9),..parent},GrantSpec {tenant:TenantId(9),..parent}];
    assert_eq!(restrict_many(&parent,&mismatches),vec![Err(AttenuationError::WouldAmplify);2]);
    let wide_scope=GrantSpec {scope:Scope::Tenant,..narrow};
    let other_resource=GrantSpec {scope:Scope::Resource(ResourceId(4)),..narrow};
    let extra_action=GrantSpec {actions:ActionSet {read:true,append:true},..narrow};
    let extra_cost=GrantSpec {max_cost:5,..narrow};
    assert_eq!(restrict_many(&narrow,&[wide_scope,other_resource,extra_action,extra_cost,narrow,empty]),vec![Err(AttenuationError::WouldAmplify),Err(AttenuationError::WouldAmplify),Err(AttenuationError::WouldAmplify),Err(AttenuationError::WouldAmplify),Ok(narrow),Ok(empty)]);
    let read_only=GrantSpec {actions:ActionSet {read:true,append:false},..narrow};
    assert_eq!(restrict_many(&read_only,&[read_only,narrow]),vec![Ok(read_only),Err(AttenuationError::WouldAmplify)]);
    assert_eq!(parent.max_cost,50);assert_eq!(narrow.scope,Scope::Resource(ResourceId(3)));
}`,
);

const bindingModel = `${identityModel}
// Jawny deterministyczny test double: nie implementuje rzeczywistej polityki.
#[derive(Debug)] struct Authority { principal:Principal, expected:Vec<Request>, failure:Option<(usize,Denial)> }
impl Authority {
    fn decide(&self, principal:Principal, request:&Request, index:usize)->Result<(),Denial> {
        if principal != self.principal || self.expected.get(index) != Some(request) { return Err(Denial::NoMatchingGrant); }
        match self.failure { Some((at,reason)) if at == index => Err(reason), _ => Ok(()) }
    }
}
#[derive(Debug)] struct Authorized<'a> { authority:&'a Authority, principal:Principal, request:Request }
`;
const binding = task(
  "authorization-binding-atomic-batch",
  "service-bound-authorization-use",
  "service-authorization/bound-batch-v1",
  "Zwiąż cały pakiet albo oddaj oryginalne żądania",
  "Napisz authorize_batch(authority, principal, requests). Przed przeniesieniem czegokolwiek sprawdź kolejno wszystkie żądania przez authority.decide(principal, &request, index). Decide jest jawnym deterministycznym test double sprawdzającym argumenty i indeks, bez dowodu rzeczywistej polityki. Pierwsza odmowa daje Err((powód, CAŁY oryginalny Vec<Request>)) z niezmienionym payload i kolejnością. Pełny sukces zużywa Vec i zwraca po jednym Authorized z tą samą &Authority, principal i oryginalnym Request. Pusty pakiet daje pusty sukces. To atomowa konstrukcja pakietu świadków z odzyskaniem wszystkich wejść przy błędzie, bez zapisu księgi, uwierzytelnienia ani gwarancji globalnego zakazu powtórzenia.",
  bindingModel,
  "fn authorize_batch<'a>(authority: &'a Authority, principal: Principal, requests: Vec<Request>) -> Result<Vec<Authorized<'a>>, (Denial, Vec<Request>)>",
  `    for (index,request) in requests.iter().enumerate() {
        if let Err(reason) = authority.decide(principal, request, index) {
            return Err((reason, requests));
        }
    }
    Ok(requests.into_iter().map(|request| Authorized { authority, principal, request }).collect())`,
  `fn binding_requests()->Vec<Request> { vec![Request {resource:Resource {tenant:TenantId(2),id:ResourceId(3)},action:Action::Read,cost:0,payload:"  α\\n".into()},Request {resource:Resource {tenant:TenantId(2),id:ResourceId(4)},action:Action::Append,cost:7,payload:"🦀".into()}] }
#[test]
fn batch_binds_every_exact_input_or_returns_all_originals() {
    let principal=Principal {subject:PrincipalId(1),tenant:TenantId(2)};
    let authority=Authority {principal,expected:binding_requests(),failure:None};
    let batch=authorize_batch(&authority,principal,binding_requests()).unwrap();
    assert_eq!(batch.len(),2);
    for (witness,request) in batch.iter().zip(binding_requests()) {assert!(std::ptr::eq(witness.authority,&authority));assert_eq!(witness.principal,principal);assert_eq!(witness.request,request)}
    assert!(authorize_batch(&authority,principal,vec![]).unwrap().is_empty());
    for at in [0,1] {for reason in [Denial::TenantMismatch,Denial::NoMatchingGrant] {
        let refusing=Authority {principal,expected:binding_requests(),failure:Some((at,reason))};
        let (actual,returned)=authorize_batch(&refusing,principal,binding_requests()).unwrap_err();
        assert_eq!(actual,reason);assert_eq!(returned,binding_requests());
    }}
    let other=Principal {subject:PrincipalId(99),..principal};
    let (reason,returned)=authorize_batch(&authority,other,binding_requests()).unwrap_err();
    assert_eq!(reason,Denial::NoMatchingGrant);assert_eq!(returned,binding_requests());
    for field in 0..4 {
        let mut changed=binding_requests();
        match field {0=>changed[1].payload.push('!'),1=>changed[1].cost+=1,2=>changed[1].resource.id=ResourceId(90),_=>changed[1].action=Action::Read}
        let want=format!("{changed:?}");
        let (reason,returned)=authorize_batch(&authority,principal,changed).unwrap_err();
        assert_eq!(reason,Denial::NoMatchingGrant);assert_eq!(format!("{returned:?}"),want);
    }
}`,
);

const admissionModel = `${identityModel}
// Świadek jest stałym wejściem modelu; nie dowodzi wcześniejszej autoryzacji.
#[derive(Debug)] struct Authority;
#[derive(Debug)] struct Authorized<'a> { authority:&'a Authority, principal:Principal, request:Request }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] struct AdmissionState { accepting:bool, accepted:u64, charged_cost:u64, max_accepted:u64, max_cost:u64 }
#[derive(Debug,PartialEq,Eq)] struct Accepted { principal:Principal, request:Request }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Rejection { Closed, Capacity, CostBudget, CounterOverflow }
`;
const admission = task(
  "authorization-admission-atomic-batch",
  "service-bound-authorization-use",
  "service-authorization/admission-batch-v1",
  "Zatwierdź księgę dopiero po całym pakiecie",
  "Napisz admit_batch(batch, state). Funkcja zużywa Vec<Authorized> ze stałych świadków testowych. Najpierw closed daje Closed, także dla pustego pakietu. Dla każdego świadka w kolejności policz tymczasowo checked accepted+1, sprawdź Capacity, potem checked charged_cost+cost i CostBudget; odpowiedni overflow poprzedza limit. Każda odmowa pozostawia CAŁY stan bez zmian, także gdy wcześniejsze żądania mieściły się w limitach. Dopiero cały sukces zapisuje oba nowe liczniki i zwraca Accepted w oryginalnej kolejności z dokładnymi principal i Request. Równość limitów i koszt równy zero są dozwolone. Pusty otwarty pakiet daje pusty sukces bez zmian. Model nie weryfikuje pochodzenia świadków, wykonania, trwałości ani dostarczenia.",
  admissionModel,
  "fn admit_batch(batch: Vec<Authorized<'_>>, state: &mut AdmissionState) -> Result<Vec<Accepted>, Rejection>",
  `    if !state.accepting { return Err(Rejection::Closed); }
    let mut accepted = state.accepted;
    let mut charged = state.charged_cost;
    for witness in &batch {
        let next = accepted.checked_add(1).ok_or(Rejection::CounterOverflow)?;
        if next > state.max_accepted { return Err(Rejection::Capacity); }
        accepted = next;
        let next_charged = charged.checked_add(witness.request.cost).ok_or(Rejection::CounterOverflow)?;
        if next_charged > state.max_cost { return Err(Rejection::CostBudget); }
        charged = next_charged;
    }
    state.accepted = accepted;
    state.charged_cost = charged;
    Ok(batch.into_iter().map(|w| { let _ = w.authority; Accepted {principal:w.principal,request:w.request} }).collect())`,
  `fn admission_batch<'a>(authority:&'a Authority,costs:&[u64])->Vec<Authorized<'a>> { costs.iter().enumerate().map(|(i,&cost)|Authorized {authority,principal:Principal {subject:PrincipalId(i as u64+1),tenant:TenantId(2)},request:Request {resource:Resource {tenant:TenantId(2),id:ResourceId(i as u64+3)},action:Action::Append,cost,payload:format!("🦀 {i} ")}}).collect() }
#[test]
fn whole_batch_commits_once_or_keeps_every_counter() {
    let authority=Authority;
    let initial=AdmissionState {accepting:true,accepted:2,charged_cost:3,max_accepted:4,max_cost:10};
    let mut state=initial;
    let accepted=admit_batch(admission_batch(&authority,&[7,0]),&mut state).unwrap();
    assert_eq!(state,AdmissionState {accepted:4,charged_cost:10,..initial});
    assert_eq!(accepted.len(),2);
    for (i,item) in accepted.iter().enumerate() {
        assert_eq!(item.principal,Principal {subject:PrincipalId(i as u64+1),tenant:TenantId(2)});
        assert_eq!(item.request,Request {resource:Resource {tenant:TenantId(2),id:ResourceId(i as u64+3)},action:Action::Append,cost:[7,0][i],payload:format!("🦀 {i} ")});
    }
    for (start,costs,want) in [
        (AdmissionState {accepting:false,..initial},vec![],Rejection::Closed),
        (initial,vec![0,0,0],Rejection::Capacity),
        (initial,vec![3,5],Rejection::CostBudget),
        (AdmissionState {accepted:u64::MAX,max_accepted:u64::MAX,..initial},vec![0],Rejection::CounterOverflow),
        (AdmissionState {charged_cost:u64::MAX,max_cost:u64::MAX,..initial},vec![0,1],Rejection::CounterOverflow),
    ] { let mut state=start;assert_eq!(admit_batch(admission_batch(&authority,&costs),&mut state),Err(want));assert_eq!(state,start); }
    let mut state=initial;assert!(admit_batch(vec![],&mut state).unwrap().is_empty());assert_eq!(state,initial);
}`,
);

export const authorizationRecoverySteps = {
  policy: matching,
  attenuation: intersection,
  binding,
  admission,
};

const schemaModel = `use std::collections::HashSet;
#[derive(Debug,PartialEq,Eq)] struct Row { id:u64, done:bool, title:String }
#[derive(Debug,PartialEq,Eq)] struct LegacyRow { done:bool, title:String }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum NextId { Available(u64), Exhausted }
#[derive(Debug,PartialEq,Eq)] struct Snapshot { rows:Vec<Row>, next:NextId }
#[derive(Debug,Clone,Copy,PartialEq,Eq)] enum Version { V1, V2 }
#[derive(Debug,PartialEq,Eq)] enum DecodedSnapshot { V1(Vec<LegacyRow>), V2(Snapshot) }
#[derive(Debug,PartialEq,Eq)] struct Loaded { version:Version, snapshot:Snapshot }
#[derive(Debug,PartialEq,Eq)] enum SnapshotError { ZeroId, DuplicateId, InvalidNext, TooManyLegacyRows }
`;
export const schemaSnapshotRecovery = task(
  "schema-validate-current-snapshot",
  "file-version-meaning",
  "file-schema-evolution/validate-snapshot-v1",
  "Przenieś V1 i sprawdź tożsamość V2",
  "Napisz normalize_snapshot(decoded) -> Result<Loaded, SnapshotError>. Dla V1 przypisz wierszom ID od 1 według pozycji, zachowaj kolejność, done oraz dokładny tytuł (także duplikaty i odstępy). NEXT wskazuje pierwszy wolny numer, a puste V1 ma NEXT=Available(1). Stosuj checked_add: po ostatnim u64 NEXT jest Exhausted; dalszy wiersz daje TooManyLegacyRows. Loaded pamięta Version::V1. Dla V2 zachowaj istniejące id, kolejność, done, tytuły i NEXT oraz Version::V2; nie numeruj ponownie i nie obliczaj nowego znacznika. Sprawdź w kolejności wierszy: ID równe zero daje ZeroId, powtórzone id daje DuplicateId. Potem Available(n) wymaga n > 0 i n większego od każdego id; inaczej InvalidNext. Exhausted jest poprawne także po usunięciu wszystkich rekordów. To osobny kontrakt migracji ze sprawdzeniem tożsamości bieżących danych; model nie czyta plików i nie dowodzi atomowości zapisu.",
  schemaModel,
  "fn normalize_snapshot(decoded: DecodedSnapshot) -> Result<Loaded, SnapshotError>",
  `    match decoded {
        DecodedSnapshot::V1(legacy) => {
            let mut rows = Vec::new();
            let mut next = NextId::Available(1);
            for row in legacy {
                let NextId::Available(id) = next else { return Err(SnapshotError::TooManyLegacyRows); };
                rows.push(Row {id,done:row.done,title:row.title});
                next = match id.checked_add(1) { Some(value) => NextId::Available(value), None => NextId::Exhausted };
            }
            Ok(Loaded {version:Version::V1,snapshot:Snapshot {rows,next}})
        }
        DecodedSnapshot::V2(snapshot) => {
            let mut seen = HashSet::new();
            for row in &snapshot.rows {
                if row.id == 0 { return Err(SnapshotError::ZeroId); }
                if !seen.insert(row.id) { return Err(SnapshotError::DuplicateId); }
            }
            if let NextId::Available(next) = snapshot.next {
                if next == 0 || snapshot.rows.iter().any(|row| row.id >= next) { return Err(SnapshotError::InvalidNext); }
            }
            Ok(Loaded {version:Version::V2, snapshot})
        }
    }`,
  `fn rows(ids:&[u64])->Vec<Row> {ids.iter().enumerate().map(|(i,&id)|Row {id,done:i%2==0,title:"  duplikat🦀\\t ".into()}).collect()}
#[test]
fn migrates_v1_order_duplicates_status_and_next_including_empty_input() {
    let loaded=normalize_snapshot(DecodedSnapshot::V1(vec![LegacyRow {done:true,title:" zeta\\t ".into()},LegacyRow {done:false,title:"alpha".into()},LegacyRow {done:true,title:"alpha".into()}])).unwrap();
    assert_eq!(loaded,Loaded {version:Version::V1,snapshot:Snapshot {rows:vec![Row {id:1,done:true,title:" zeta\\t ".into()},Row {id:2,done:false,title:"alpha".into()},Row {id:3,done:true,title:"alpha".into()}],next:NextId::Available(4)}});
    assert_eq!(normalize_snapshot(DecodedSnapshot::V1(vec![])),Ok(Loaded {version:Version::V1,snapshot:Snapshot {rows:vec![],next:NextId::Available(1)}}));
}
#[test]
fn preserves_v2_identity_and_rejects_invalid_next_without_renumbering() {
    for (ids,next) in [(vec![],NextId::Available(1)),(vec![9,2],NextId::Available(90)),(vec![u64::MAX],NextId::Exhausted),(vec![],NextId::Exhausted),(vec![3],NextId::Exhausted)] {
        let actual=normalize_snapshot(DecodedSnapshot::V2(Snapshot {rows:rows(&ids),next})).unwrap();
        assert_eq!(actual,Loaded {version:Version::V2,snapshot:Snapshot {rows:rows(&ids),next}});
    }
    for (ids,next,want) in [(vec![0],NextId::Available(1),SnapshotError::ZeroId),(vec![7,7],NextId::Available(8),SnapshotError::DuplicateId),(vec![9,2],NextId::Available(9),SnapshotError::InvalidNext),(vec![9,2],NextId::Available(3),SnapshotError::InvalidNext),(vec![],NextId::Available(0),SnapshotError::InvalidNext),(vec![u64::MAX],NextId::Available(u64::MAX),SnapshotError::InvalidNext),(vec![0,0],NextId::Available(0),SnapshotError::ZeroId),(vec![5,5,0],NextId::Available(0),SnapshotError::DuplicateId)] {
        assert_eq!(normalize_snapshot(DecodedSnapshot::V2(Snapshot {rows:rows(&ids),next})),Err(want));
    }
}`,
);
