export type ContentRawItemForm = { title: string; body?: string; url?: string };

export function mapContentRawItemsForApi(items: ContentRawItemForm[]) {
  return items.map((item) => ({
    title: item.title,
    body: item.body || undefined,
    url: item.url || undefined,
  }));
}

export type TrendRawItemForm = {
  title: string;
  body?: string;
  url?: string;
  sourceId?: string;
};

export function mapTrendRawItemsForApi(items: TrendRawItemForm[]) {
  return items.map((item) => {
    const url = item.url?.trim() || undefined;
    const sourceId = item.sourceId?.trim() || undefined;
    return {
      title: item.title.trim(),
      body: (item.body ?? "").trim(),
      url,
      sourceId,
    };
  });
}
