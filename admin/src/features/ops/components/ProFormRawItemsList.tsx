import type { ReactNode } from "react";
import { ProFormList } from "@ant-design/pro-components";
import {
  RAW_ITEMS_LIST_ACTION_GUARD,
  RAW_ITEMS_LIST_RULES,
  RAW_ITEMS_LIST_UI,
} from "@/features/ops/constants/jobRunForm";

type ProFormRawItemsListProps = {
  name?: string;
  label: string;
  children: ReactNode;
};

export function ProFormRawItemsList({
  name = "rawItems",
  label,
  children,
}: ProFormRawItemsListProps) {
  return (
    <ProFormList
      name={name}
      label={label}
      {...RAW_ITEMS_LIST_UI}
      rules={[...RAW_ITEMS_LIST_RULES]}
      actionGuard={RAW_ITEMS_LIST_ACTION_GUARD}
    >
      {children}
    </ProFormList>
  );
}
