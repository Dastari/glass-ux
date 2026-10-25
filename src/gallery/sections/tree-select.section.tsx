import { useCallback, useRef, useState } from "react"
import { z } from "zod"
import { IconUsers } from "../../icons/generated/icons.js"
import { Field } from "../../ui/field/index.js"
import { Form, FormActions, FormStack, formBehaviour, useAppForm } from "../../ui/form/index.js"
import { Segmented } from "../../ui/segmented/index.js"
import { TreeSelect, TreeSelectField, type CheckStrategy } from "../../ui/tree-select/index.js"
import type { TreeNode } from "../../ui/tree/index.js"
import { ContainerLab, Rules, SectionPage, Specimen } from "../kit.js"
import { wait } from "./forms.fixtures.js"
import { DEVICE_GROUPS, ORG_CHART, deviceGroupChildren } from "./pickers.fixtures.js"

const STRATEGIES: Array<{ value: CheckStrategy; label: string }> = [
  { value: "parent", label: "parent" },
  { value: "child", label: "child" },
  { value: "all", label: "all" },
]

function StrategyDemo() {
  const [strategy, setStrategy] = useState<CheckStrategy>("parent")
  const [value, setValue] = useState<string[]>(["platform", "p-kenji"])
  return (
    <FormStack>
      <Field label="Check strategy" nativeLabel={false}>
        <Segmented options={STRATEGIES} value={strategy} onValueChange={setStrategy} />
      </Field>
      <Field label="Notify" nativeLabel={false} hint={`value: ${JSON.stringify(value)}`}>
        <TreeSelect multiple nodes={ORG_CHART} checkStrategy={strategy} value={value} onValueChange={setValue} placeholder="Choose teams or people" defaultExpanded={["kestrel", "engineering"]} />
      </Field>
    </FormStack>
  )
}

/** Replace a branch's children in a tree (what an application does when they arrive). */
function withChildren(nodes: TreeNode[], id: string, children: TreeNode[]): TreeNode[] {
  return nodes.map((node) => (node.id === id ? { ...node, children } : node.children ? { ...node, children: withChildren(node.children, id, children) } : node))
}

function LazyDemo() {
  const [nodes, setNodes] = useState(DEVICE_GROUPS)
  const failed = useRef(false)
  const onLoadChildren = useCallback(async (node: TreeNode) => {
    await wait(700)
    // The first load of Test lab fails, to show Retry.
    if (node.id === "dg-lab" && !failed.current) {
      failed.current = true
      throw new Error("Timed out")
    }
    setNodes((current) => withChildren(current, node.id, deviceGroupChildren(node.id)))
  }, [])
  return (
    <Field label="Apply to devices" nativeLabel={false} hint="Members load when a group opens; Test lab fails once.">
      <TreeSelect multiple nodes={nodes} onLoadChildren={onLoadChildren} placeholder="Choose device groups" />
    </Field>
  )
}

function FormDemo() {
  const form = useAppForm({
    ...formBehaviour,
    defaultValues: { owner: null as string | null, watchers: [] as string[] },
    validators: {
      onDynamic: z.object({
        owner: z.string({ message: "Choose an owner" }).nullable().refine((value) => value !== null, "Choose an owner"),
        watchers: z.array(z.string()).max(4, "Choose at most four"),
      }),
    },
    onSubmit: () => wait(600),
  })
  return (
    <Form form={form} aria-label="Asset ownership" className="w-full">
      <FormStack>
        <form.AppField name="owner">{() => <TreeSelectField label="Owner" nodes={ORG_CHART} placeholder="Choose a person" />}</form.AppField>
        <form.AppField name="watchers">{() => <TreeSelectField label="Watchers" multiple optional nodes={ORG_CHART} placeholder="Choose teams or people" />}</form.AppField>
        <FormActions>
          <form.SubmitButton>Save</form.SubmitButton>
        </FormActions>
      </FormStack>
    </Form>
  )
}

export default function TreeSelectSection() {
  return (
    <SectionPage>
      <Specimen title="One node" description="Leaves are chosen; groups open. With selectableGroups a group can be chosen too, and opens from its chevron.">
        <FormStack>
          <Field label="Reports to" nativeLabel={false}>
            <TreeSelect nodes={ORG_CHART} defaultValue="p-kenji" placeholder="Choose a person" />
          </Field>
          <Field label="Cost centre" nativeLabel={false}>
            <TreeSelect nodes={ORG_CHART} selectableGroups defaultValue="north-plant" icon={<IconUsers />} placeholder="Choose a unit" />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Several nodes" description="Checkboxes with mixed branches. parent lists a fully checked branch instead of its members; child lists people only; all lists both. Disabled people keep their state.">
        <StrategyDemo />
      </Specimen>

      <Specimen title="Chips" description="One line folds the rest into +N, which lists them; wrap lets chips flow onto more lines in a form.">
        <FormStack>
          <Field label="One line" nativeLabel={false}>
            <TreeSelect multiple width="medium" nodes={ORG_CHART} defaultValue={["platform", "firmware", "p-ravi", "logistics", "finance"]} />
          </Field>
          <Field label="Wrapping" nativeLabel={false}>
            <TreeSelect multiple wrap nodes={ORG_CHART} defaultValue={["platform", "firmware", "p-ravi", "logistics", "finance"]} />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Lazy branches">
        <LazyDemo />
      </Specimen>

      <Specimen title="In a form" description="TreeSelectField binds to string | null, or string[] with multiple; the first error replaces the hint in place.">
        <FormDemo />
      </Specimen>

      <Specimen title="States" layout="grid">
        <FormStack>
          <Field label="Invalid" nativeLabel={false} error="Choose an owner">
            <TreeSelect nodes={ORG_CHART} placeholder="Choose a person" />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Read-only" nativeLabel={false}>
            <TreeSelect nodes={ORG_CHART} defaultValue="p-amara" readOnly />
          </Field>
        </FormStack>
        <FormStack>
          <Field label="Disabled" nativeLabel={false} disabled>
            <TreeSelect multiple nodes={ORG_CHART} defaultValue={["finance"]} disabled />
          </Field>
        </FormStack>
      </Specimen>

      <Specimen title="Over glass and imagery" backdrop>
        <TreeSelect multiple nodes={ORG_CHART} defaultValue={["platform", "p-ravi"]} aria-label="Teams over imagery" className="w-72 max-w-full" />
      </Specimen>

      <ContainerLab>
        <div className="flex h-full items-center p-1">
          <TreeSelect multiple size="sm" nodes={ORG_CHART} defaultValue={["platform", "firmware", "finance"]} aria-label="Teams" />
        </div>
      </ContainerLab>

      <Rules
        do={[
          "Use a tree when the options have a real hierarchy people navigate by: org units, folders, device groups.",
          "Choose the check strategy by what the value means: parent when a team stands for its future members.",
          "Give lazily loaded branches hasChildren so they show a chevron before they load.",
        ]}
        dont={[
          "Use TreeSelect for a flat list; use Select, Combobox or MultiSelect.",
          "Nest more than four or five levels; use a Cascader or a dedicated browser.",
        ]}
      />
    </SectionPage>
  )
}
