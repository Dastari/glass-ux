import { useState } from 'react'
import { ContainerLab, Rules, SectionPage, Specimen } from '../kit.js'
import { IconActivity, IconCalendar, IconFileText, IconFlag, IconFolder, IconGitBranch, IconHome, IconMail, IconMapPin, IconSearch, IconTag, IconTickets, IconUser, IconUserCheck } from '../../icons/generated/icons.js'
import { Field } from '../../ui/field/index.js'
import { ReferenceInput, type ReferenceKind, type ReferenceLink, type ReferenceSource } from '../../ui/reference-input/index.js'
import { DEMO_DATASET } from '../fixtures/organisations.js'
const kinds=[{id:'person',noun:'Person',plural:'People',icon:IconUser},{id:'project',noun:'Project',plural:'Projects',icon:IconFolder}]
const targets=[...DEMO_DATASET.people.map(p=>({kind:'person',id:p.id,label:p.name,image:p.photo})),{kind:'project',id:'meridian',label:'Meridian launch'}]
const source:ReferenceSource={suggestions:targets,search:async(q,{kind})=>targets.filter(t=>(!kind||t.kind===kind)&&t.label.toLowerCase().includes(q.toLowerCase()))}
const relations=[{value:'assigned-to',label:'Assigned to',kinds:['person'],exclusive:true},{value:'related',label:'Related to'}]
function Demo({disabled=false,readOnly=false}:{disabled?:boolean;readOnly?:boolean}){
 const [value,setValue]=useState<ReferenceLink[]>([{target:targets[0]!,relation:'assigned-to'}])
 return <Field label="References"><ReferenceInput value={value} onValueChange={setValue} source={source} kinds={kinds} relations={relations} defaultRelation="related" disabled={disabled} readOnly={readOnly}/></Field>
}
const manyKinds:ReferenceKind[]=[
 {id:'person',noun:'Person',plural:'People',icon:IconUser},
 {id:'team',noun:'Team',plural:'Teams',icon:IconUserCheck},
 {id:'project',noun:'Project',plural:'Projects',icon:IconFolder},
 {id:'site',noun:'Site',plural:'Sites',icon:IconMapPin},
 {id:'depot',noun:'Depot',plural:'Depots',icon:IconHome},
 {id:'ticket',noun:'Ticket',plural:'Tickets',icon:IconTickets},
 {id:'document',noun:'Document',plural:'Documents',icon:IconFileText},
 {id:'event',noun:'Event',plural:'Events',icon:IconCalendar},
 {id:'branch',noun:'Branch',plural:'Branches',icon:IconGitBranch},
 {id:'alert',noun:'Alert',plural:'Alerts',icon:IconFlag},
 {id:'reading',noun:'Reading',plural:'Readings',icon:IconActivity},
 {id:'message',noun:'Message',plural:'Messages',icon:IconMail},
 {id:'label',noun:'Label',plural:'Labels',icon:IconTag},
 {id:'report',noun:'Report',plural:'Reports',icon:IconSearch},
]
const manyTargets=manyKinds.map(kind=>({kind:kind.id,id:`${kind.id}-1`,label:`${kind.noun} one`}))
const manySource:ReferenceSource={suggestions:manyTargets,search:async(q,{kind})=>manyTargets.filter(t=>(!kind||t.kind===kind)&&t.label.toLowerCase().includes(q.toLowerCase()))}
function ManyKinds(){
 const [value,setValue]=useState<ReferenceLink[]>([])
 return <Field label="Linked records"><ReferenceInput value={value} onValueChange={setValue} source={manySource} kinds={manyKinds}/></Field>
}
const tagTargets=['Printing','Hardware','Dock 3','Night shift'].map(label=>({kind:'tag',id:label,label}))
const tagSource:ReferenceSource={suggestions:tagTargets,search:async q=>tagTargets.filter(t=>t.label.toLowerCase().includes(q.toLowerCase()))}
function Tags(){
 const [value,setValue]=useState<ReferenceLink[]>([{target:tagTargets[0]!,relation:'related'}])
 return <Field label="Tags"><ReferenceInput value={value} onValueChange={setValue} source={tagSource} kinds={[{id:'tag',noun:'Tag',plural:'Tags',icon:IconTag}]} placeholder="Type @ to tag" addLabel="Tag…"/></Field>
}
export default function ReferenceInputSection(){return <SectionPage>
 <Specimen title="Linked items" layout="stack"><Demo/><Demo disabled/><Demo readOnly/></Specimen>
 <Specimen title="Many kinds" description="The kind filter keeps to one row and scrolls, so fourteen kinds leave the results their room. Alt ← → moves through them and brings the chosen one into view." layout="stack"><div className="w-full" data-testid="reference-many-kinds"><ManyKinds/></div></Specimen>
 <Specimen title="Add label" description="addLabel names the add button for this field; every other field keeps the referenceInput.link message." layout="stack"><div className="w-full" data-testid="reference-tags"><Tags/></div></Specimen>
 <ContainerLab>{()=> <Demo/>}</ContainerLab>
 <Rules do={['Supply a cancellable search source.','Name every entity kind and relation.']} dont={['Store a display label as the entity identifier.']}/>
</SectionPage>}
