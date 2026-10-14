import { useState } from "react"
import { ContainerLab, Example, Rules, SectionPage, Specimen, TokenTable } from "../kit.js"
import { Pagination } from "../../ui/pagination/index.js"

const TOTAL = 1284

function OffsetPager({ compact = false }: { compact?: boolean }) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const pageRows = Math.min(pageSize, TOTAL - pageIndex * pageSize)
  return (
    <Pagination
      label="Endpoint pages"
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageRows={pageRows}
      rowCount={TOTAL}
      onPageChange={setPageIndex}
      onPageSizeChange={(size) => {
        setPageSize(size)
        setPageIndex(0)
      }}
      compact={compact}
    />
  )
}

function CursorPager() {
  const [page, setPage] = useState(0)
  return (
    <Pagination
      label="Activity pages"
      pageIndex={page}
      pageSize={50}
      pageRows={50}
      cursor={{
        hasPrevious: page > 0,
        hasNext: page < 6,
        onPrevious: () => setPage((value) => Math.max(0, value - 1)),
        onNext: () => setPage((value) => value + 1),
        onFirst: () => setPage(0),
      }}
    />
  )
}

export default function PaginationSection() {
  return (
    <SectionPage>
      <Specimen title="Offset pages" description="The range, the page size, then first / previous / page / next / last. Type a page and press Enter to jump." layout="stack" wide>
        <div data-testid="pager-offset">
          <OffsetPager />
        </div>
      </Specimen>

      <Specimen title="Modes and states" layout="stack" wide>
        <Example label="Cursor pages: no total, no last page">
          <div className="pager-demo-row" data-testid="pager-cursor">
            <CursorPager />
          </div>
        </Example>
        <Example label="Compact: short containers and card lists">
          <div className="pager-demo-row">
            <OffsetPager compact />
          </div>
        </Example>
        <Example label="Loading">
          <div className="pager-demo-row">
            <Pagination label="Loading pages" pageIndex={0} pageSize={25} pageRows={0} loading />
          </div>
        </Example>
        <Example label="Disabled">
          <div className="pager-demo-row">
            <Pagination label="Disabled pages" pageIndex={3} pageSize={25} pageRows={25} rowCount={TOTAL} disabled onPageChange={() => {}} onPageSizeChange={() => {}} />
          </div>
        </Example>
      </Specimen>

      <ContainerLab description="The page size folds away first, then the page field, then first/last. The range and previous/next always stay.">
        {() => <OffsetPager />}
      </ContainerLab>

      <Rules
        do={[
          "Put the pager in the status bar of the table or list it pages.",
          "Keep the page and page size in the URL so Back steps through pages.",
          "Use cursor mode when the server cannot count cheaply.",
        ]}
        dont={[
          "Show a pager when everything fits on one page; show the count instead.",
          "Number every page as links; the page field jumps anywhere.",
          "Reset the page size when the user changes sorting.",
        ]}
      />

      <TokenTable
        tokens={[
          ["--control-h-sm", "Buttons, size select and page field"],
          ["--radius-control", "Size select and page field"],
          ["--glass-fill-control", "Field fill"],
          ["--fg-muted", "Range text"],
        ]}
      />
    </SectionPage>
  )
}
