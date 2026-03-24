import { ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { CHANNEL_TYPE_OPTIONS } from "@/features/ops/constants/jobRunForm";

type ProFormChannelFieldsProps = {
  channelIdPlaceholder?: string;
};

export function ProFormChannelFields({
  channelIdPlaceholder = "vd. blog-1",
}: ProFormChannelFieldsProps) {
  return (
    <>
      <ProFormText
        name="channelId"
        label="Channel ID"
        rules={[{ required: true, message: "Bắt buộc" }]}
        fieldProps={{ placeholder: channelIdPlaceholder }}
      />
      <ProFormSelect
        name="channelType"
        label="Loại kênh"
        rules={[{ required: true }]}
        options={[...CHANNEL_TYPE_OPTIONS]}
      />
    </>
  );
}
