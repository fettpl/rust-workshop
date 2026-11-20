// Mixed scope: operational package metadata and Rust examples are MIT; original Polish teaching prose is CC BY 4.0.
import type { ProjectContract, ProjectPackage } from "../../domain/types";
import {libSource,starterLibSource,policyTests,attenuationTests,bindingTests,admissionTests,readme,threatModel,worksheet} from "./service-authorization/fixtures";
export const serviceAuthorizationPackage:ProjectPackage={
 id:"service-authorization-workshop",title:"Projekt: ograniczona autoryzacja",description:"Syntetyczna polityka i przyjęcie żądania w procesie.",
 instructions:["Zaimplementuj cztery operacje; koszt jest zadeklarowanym parametrem."],
 revealStepRefs:[
 {lessonId:"service-authorization-policy",stepId:"authorization-policy-apply"},{lessonId:"service-authorization-policy",stepId:"authorization-policy-blank"},
 {lessonId:"service-authorization-attenuation",stepId:"authorization-attenuation-apply"},{lessonId:"service-authorization-attenuation",stepId:"authorization-attenuation-blank"},
 {lessonId:"service-authorization-binding",stepId:"authorization-binding-apply"},{lessonId:"service-authorization-binding",stepId:"authorization-binding-blank"},
 {lessonId:"service-authorization-admission",stepId:"authorization-admission-apply"},{lessonId:"service-authorization-admission",stepId:"authorization-admission-blank"}],starterRevealStepRefs:[],
 files:[{path:"Cargo.toml",starter:'[package]\nname = "service-authorization-workshop"\nversion = "1.0.0"\nedition = "2024"\nrust-version = "1.85.0"\npublish = false\nlicense = "MIT"\n'},
 {path:"Cargo.lock",starter:'version = 4\n\n[[package]]\nname = "service-authorization-workshop"\nversion = "1.0.0"\n'},
 {path:"src/lib.rs",starter:starterLibSource,solution:libSource},
 {path:"tests/policy.rs",starter:policyTests},{path:"tests/attenuation.rs",starter:attenuationTests},{path:"tests/binding.rs",starter:bindingTests},{path:"tests/admission.rs",starter:admissionTests},{path:"README.md",starter:readme},{path:"THREAT_MODEL.md",starter:threatModel},{path:"WORKSHEET.md",starter:worksheet}]
};

export const serviceAuthorizationProject:ProjectContract={id:"service-authorization",title:"Ograniczona autoryzacja",objective:"Zwiąż zadeklarowaną politykę z dokładnym żądaniem i atomową księgą.",lessonIds:["service-authorization-policy","service-authorization-attenuation","service-authorization-binding","service-authorization-admission"],reviewConceptIds:["service-scoped-authority","service-bound-authorization-use"],requiredBehaviors:["jeden grant pokrywa całą operację","osłabienie nie rozszerza praw","świadek zachowuje oryginalne dane","odmowa nie zmienia księgi"],requiredEvidence:["testy granic polityki i księgi","osobne kontrole kompilatora oraz mutacje semantyczne","testy przekazania dokładnego principal oraz oryginalnych resource/action/cost/payload przez autoryzację"],constraints:["syntetyczna tożsamość, bez uwierzytelniania","koszt deklarowany nie mierzy zasobów"],lessonId:"service-authorization-policy",adversarialLessonId:"service-authorization-admission",adversarialInject:"Odrzucone żądanie trafia do zamkniętej lub pełnej księgi.",retrospective:["Kto instaluje politykę?","Dlaczego Accepted nie oznacza wykonania?"],package:serviceAuthorizationPackage};
