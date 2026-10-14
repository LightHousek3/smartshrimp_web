// Shared Tailwind utilities for the admin pages. Important modifiers are scoped
// to Ant Design overrides because its runtime styles are outside CSS layers.
export const adminStyles = {
    primaryButton: 'border-0! bg-[linear-gradient(90deg,#77a1d3,#79cbca)]! font-semibold! text-white! shadow-none! enabled:hover:bg-[linear-gradient(90deg,#5f91cc,#57bdbd)]! enabled:focus-visible:bg-[linear-gradient(90deg,#5f91cc,#57bdbd)]!',
    iconButton: 'inline-flex! h-[26px]! min-w-[26px]! w-[26px]! items-center! justify-center! rounded-md! border! border-[#e2e8f0]! bg-[#f8fafc]! p-0! [&.ant-btn-circle]:rounded-full!',
    avatar: 'shrink-0! bg-[rgba(29,122,214,0.12)]! font-[Sora,Plus_Jakarta_Sans,sans-serif]! text-[13px]! font-bold! text-[#1d7ad6]!',
    search: 'w-[280px]! rounded-lg! border-[#e0e6ef]! bg-white/90! [&_.ant-input-prefix]:text-[#6a7994] max-[600px]:w-full!',
    filter: 'w-[180px]! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:border-[#e0e6ef]! [&_.ant-select-selector]:bg-white/90! max-[600px]:w-full!',
    statusFilter: 'w-[195px]! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:border-[#e0e6ef]! [&_.ant-select-selector]:bg-white/90! max-[600px]:w-full!',
    filterDropdown: '[&_.ant-table-filter-dropdown]:min-w-[148px] [&_.ant-table-filter-dropdown]:overflow-hidden [&_.ant-table-filter-dropdown]:rounded-lg [&_.ant-table-filter-dropdown-btns]:min-h-[42px] [&_.ant-table-filter-dropdown-btns]:gap-3 [&_.ant-table-filter-dropdown-btns]:px-2 [&_.ant-table-filter-dropdown-btns]:py-[7px] [&_.ant-btn]:min-w-[38px] [&_.ant-btn]:px-[7px] [&_.ant-btn]:text-xs',
    tableShell: [
        'min-w-0 overflow-hidden rounded-lg border border-[#e8edf4] bg-white shadow-[0_1px_3px_rgba(15,28,46,0.06)]',
        '[&_.ant-table]:rounded-none! [&_.ant-table-thead>tr>th]:bg-[#f8fafc]! [&_.ant-table-thead>tr>th]:py-[13px]! [&_.ant-table-thead>tr>th]:text-[13px]! [&_.ant-table-thead>tr>th]:font-semibold! [&_.ant-table-thead>tr>th]:text-[#52647d]!',
        '[&_.ant-table-tbody>tr>td]:border-[#e8edf4]! [&_.ant-table-tbody>tr>td]:py-3! [&_.ant-table-tbody>tr:hover>td]:bg-[#f2f8fd]!',
        '[&_.ant-table-pagination]:m-0! [&_.ant-table-pagination]:min-h-[58px] [&_.ant-table-pagination]:items-center [&_.ant-table-pagination]:border-t [&_.ant-table-pagination]:border-[#edf0f5] [&_.ant-table-pagination]:bg-white [&_.ant-table-pagination]:px-4 [&_.ant-table-pagination]:py-3.5',
        '[&_.ant-pagination-total-text]:me-3 [&_.ant-pagination-total-text]:text-xs [&_.ant-pagination-total-text]:text-[#52647d] [&_.ant-pagination-total-text]:tabular-nums',
        '[&_:is(.ant-pagination-item,.ant-pagination-prev,.ant-pagination-next)]:h-7! [&_:is(.ant-pagination-item,.ant-pagination-prev,.ant-pagination-next)]:min-w-7! [&_:is(.ant-pagination-item,.ant-pagination-prev,.ant-pagination-next)]:rounded-lg! [&_:is(.ant-pagination-item,.ant-pagination-prev,.ant-pagination-next)]:leading-[26px]!',
        '[&_.ant-pagination-item]:border-transparent! [&_.ant-pagination-item]:bg-transparent! [&_.ant-pagination-item-active]:border-[#1d7ad6]! [&_.ant-pagination-item-active]:bg-white! [&_.ant-pagination-item-active_a]:font-semibold! [&_.ant-pagination-item-active_a]:text-[#1d7ad6]!',
        'max-[600px]:[&_.ant-table-pagination]:justify-center max-[600px]:[&_.ant-pagination-total-text]:m-0 max-[600px]:[&_.ant-pagination-total-text]:mb-1.5 max-[600px]:[&_.ant-pagination-total-text]:w-full max-[600px]:[&_.ant-pagination-total-text]:text-center',
    ].join(' '),
    descriptions: '[&_.ant-descriptions-item-label]:w-[142px] [&_.ant-descriptions-item-label]:text-xs! [&_.ant-descriptions-item-label]:text-[#6a7994]! [&_.ant-descriptions-item-content]:text-[13px]! [&_.ant-descriptions-item-content]:font-medium! [&_.ant-descriptions-item-content]:text-[#0f1c2e]! [&_.ant-descriptions-item-content]:[overflow-wrap:anywhere]',
    drawer: '[&_.ant-drawer-footer]:border-[#e8edf4] [&_.ant-drawer-footer]:px-5! [&_.ant-drawer-footer]:py-3.5! [&_.ant-drawer-footer_.ant-btn]:min-h-9 [&_.ant-drawer-footer_.ant-btn:not(.ant-btn-primary)]:border-[#d7dee8] [&_.ant-drawer-footer_.ant-btn:not(.ant-btn-primary)]:text-[#3a4a63]',
    drawerRoot: 'max-[600px]:[&_.ant-drawer-content-wrapper]:max-w-[calc(100vw-18px)]',
    modal: '[&_.ant-modal-title]:font-[Sora,Plus_Jakarta_Sans,sans-serif]! [&_.ant-modal-title]:text-[17px]! [&_.ant-modal-title]:text-[#28364a]!',
};
