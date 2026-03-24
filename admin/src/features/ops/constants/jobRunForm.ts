/** Shared options & defaults for “run job” / “run trend” modals. */

export const CHANNEL_TYPE_OPTIONS = [
  { value: "blog", label: "Blog" },
  { value: "social", label: "Social" },
  { value: "affiliate", label: "Affiliate" },
] as const;

export const DEFAULT_CHANNEL_FIELDS = {
  channelId: "blog-1",
  channelType: "blog",
} as const;

export const TREND_DOMAIN_OPTIONS = [
  { value: "sports-vn", label: "sports-vn (thể thao VN)" },
  { value: "generic", label: "generic (hostname)" },
] as const;

/** ProFormList: ít nhất một dòng, chỉ xóa khi còn > 1 dòng. */
export const RAW_ITEMS_LIST_RULES = [
  {
    required: true,
    validator: async (_: unknown, items: unknown[] | undefined) => {
      if (!items?.length) throw new Error("Cần ít nhất một dòng");
    },
  },
] as const;

export const RAW_ITEMS_LIST_ACTION_GUARD = {
  beforeRemoveRow: async (_index: number | number[], count: number) => count > 1,
};

export const RAW_ITEMS_LIST_UI = {
  min: 1,
  copyIconProps: false as const,
  deleteIconProps: { tooltipText: "Xóa dòng" },
  creatorButtonProps: {
    creatorButtonText: "+ Thêm dòng",
    type: "dashed" as const,
    block: true,
  },
};
