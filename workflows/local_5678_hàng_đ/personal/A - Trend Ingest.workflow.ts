import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : A - Trend Ingest
// Nodes   : 49  |  Connections: 68
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ManualTrigger                      manualTrigger              
// RssVnexpressThethao                rssFeedRead                
// RssTuoitreThethao                  rssFeedRead                
// RssDantriThethao                   rssFeedRead                
// RssZingnewsThethao                 rssFeedRead                
// RssBongdaFeed                      rssFeedRead                
// RssBongdaVietnam                   rssFeedRead                
// RssBongdaVleague                   rssFeedRead                
// RssBongdaChuyennhuong              rssFeedRead                
// RssBongdaC1                        rssFeedRead                
// RssBongdaAnh                       rssFeedRead                
// RssBongdaAff                       rssFeedRead                
// RssBongdaWorldcup                  rssFeedRead                
// RssThanhnienThethao                rssFeedRead                
// RssVietnamnetThethao               rssFeedRead                
// RssNldThethao                      rssFeedRead                
// RssBongda24h1                      rssFeedRead                
// RssBongda24h168                    rssFeedRead                
// RssTinthethaoFeed                  rssFeedRead                
// RssTinthethaoBongda                rssFeedRead                
// RssThethao24724h                   rssFeedRead                
// RssThethao247Bongda                rssFeedRead                
// Merge                              merge                      
// Merge2                             merge                      
// Merge3                             merge                      
// Merge4                             merge                      
// Merge5                             merge                      
// Merge6                             merge                      
// Merge7                             merge                      
// Merge8                             merge                      
// Merge9                             merge                      
// Merge10                            merge                      
// Merge11                            merge                      
// Merge12                            merge                      
// Merge13                            merge                      
// Merge14                            merge                      
// Merge15                            merge                      
// Merge16                            merge                      
// Merge17                            merge                      
// Merge18                            merge                      
// Merge19                            merge                      
// Merge20                            merge                      
// Merge21                            merge                      
// NormalizePayload                   code                       
// SkipIfEmpty                        if                         
// CallTrendApi                       httpRequest                
// GetTrendJob                        httpRequest                
// SplitCandidates                    code                       
// CallContentApi                     httpRequest                
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ManualTrigger
//    → RssVnexpressThethao
//      → Merge
//        → Merge2
//          → Merge3
//            → Merge4
//              → Merge5
//                → Merge6
//                  → Merge7
//                    → Merge8
//                      → Merge9
//                        → Merge10
//                          → Merge11
//                            → Merge12
//                              → Merge13
//                                → Merge14
//                                  → Merge15
//                                    → Merge16
//                                      → Merge17
//                                        → Merge18
//                                          → Merge19
//                                            → Merge20
//                                              → Merge21
//                                                → NormalizePayload
//                                                  → SkipIfEmpty
//                                                   .out(1) → CallTrendApi
//                                                      → GetTrendJob
//                                                        → SplitCandidates
//                                                          → CallContentApi
//    → RssTuoitreThethao
//      → Merge.in(1) (↩ loop)
//    → RssDantriThethao
//      → Merge2.in(1) (↩ loop)
//    → RssZingnewsThethao
//      → Merge3.in(1) (↩ loop)
//    → RssBongdaFeed
//      → Merge4.in(1) (↩ loop)
//    → RssBongdaVietnam
//      → Merge5.in(1) (↩ loop)
//    → RssBongdaVleague
//      → Merge6.in(1) (↩ loop)
//    → RssBongdaChuyennhuong
//      → Merge7.in(1) (↩ loop)
//    → RssBongdaC1
//      → Merge8.in(1) (↩ loop)
//    → RssBongdaAnh
//      → Merge9.in(1) (↩ loop)
//    → RssBongdaAff
//      → Merge10.in(1) (↩ loop)
//    → RssBongdaWorldcup
//      → Merge11.in(1) (↩ loop)
//    → RssThanhnienThethao
//      → Merge12.in(1) (↩ loop)
//    → RssVietnamnetThethao
//      → Merge14.in(1) (↩ loop)
//    → RssNldThethao
//      → Merge15.in(1) (↩ loop)
//    → RssBongda24h1
//      → Merge16.in(1) (↩ loop)
//    → RssBongda24h168
//      → Merge17.in(1) (↩ loop)
//    → RssTinthethaoFeed
//      → Merge18.in(1) (↩ loop)
//    → RssTinthethaoBongda
//      → Merge19.in(1) (↩ loop)
//    → RssThethao24724h
//      → Merge20.in(1) (↩ loop)
//    → RssThethao247Bongda
//      → Merge21.in(1) (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: "Hac9YDLBET7pe5vJ",
    name: "A - Trend Ingest",
    active: false,
    settings: { executionOrder: "v1", binaryMode: "separate" }
})
export class ATrendIngestWorkflow {

    // =====================================================================
// CONFIGURATION DES NOEUDS
// =====================================================================

    @node({
        id: "trigger-1",
        name: "Manual Trigger",
        type: "n8n-nodes-base.manualTrigger",
        version: 1,
        position: [0, 1000]
    })
    ManualTrigger = {};

    @node({
        id: "rss-vnexpress",
        name: "RSS vnexpress-thethao",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [224, -704]
    })
    RssVnexpressThethao = {
        url: "https://vnexpress.net/rss/the-thao.rss",
        options: {}
    };

    @node({
        id: "rss-tuoitre",
        name: "RSS tuoitre-thethao",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [224, -512]
    })
    RssTuoitreThethao = {
        url: "https://tuoitre.vn/rss/the-thao.rss",
        options: {}
    };

    @node({
        id: "rss-dantri",
        name: "RSS dantri-thethao",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [448, -344]
    })
    RssDantriThethao = {
        url: "https://dantri.com.vn/rss/the-thao.rss",
        options: {}
    };

    @node({
        id: "rss-zing",
        name: "RSS zingnews-thethao",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [672, -176]
    })
    RssZingnewsThethao = {
        url: "https://zingnews.vn/rss/the-thao.rss",
        options: {}
    };

    @node({
        id: "rss-bongda-feed",
        name: "RSS bongda-feed",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [896, -8]
    })
    RssBongdaFeed = {
        url: "https://bongda.com.vn/feed.rss",
        options: {}
    };

    @node({
        id: "rss-bongda-vn",
        name: "RSS bongda-vietnam",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [1120, 160]
    })
    RssBongdaVietnam = {
        url: "https://bongda.com.vn/viet-nam.rss",
        options: {}
    };

    @node({
        id: "rss-bongda-vleague",
        name: "RSS bongda-vleague",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [1344, 328]
    })
    RssBongdaVleague = {
        url: "https://bongda.com.vn/v-league.rss",
        options: {}
    };

    @node({
        id: "rss-bongda-cn",
        name: "RSS bongda-chuyennhuong",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [1568, 496]
    })
    RssBongdaChuyennhuong = {
        url: "https://bongda.com.vn/tin-chuyen-nhuong.rss",
        options: {}
    };

    @node({
        id: "rss-bongda-c1",
        name: "RSS bongda-c1",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [1792, 664]
    })
    RssBongdaC1 = {
        url: "https://bongda.com.vn/champions-league.rss",
        options: {}
    };

    @node({
        id: "rss-bongda-anh",
        name: "RSS bongda-anh",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [2016, 832]
    })
    RssBongdaAnh = {
        url: "https://bongda.com.vn/bong-da-anh.rss",
        options: {}
    };

    @node({
        id: "rss-bongda-aff",
        name: "RSS bongda-aff",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [2240, 1000]
    })
    RssBongdaAff = {
        url: "https://bongda.com.vn/aff-cup.rss",
        options: {}
    };

    @node({
        id: "rss-bongda-wc",
        name: "RSS bongda-worldcup",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [2464, 1168]
    })
    RssBongdaWorldcup = {
        url: "https://bongda.com.vn/world-cup.rss",
        options: {}
    };

    @node({
        id: "rss-thanhnien",
        name: "RSS thanhnien-thethao",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [2688, 1336]
    })
    RssThanhnienThethao = {
        url: "https://thanhnien.vn/rss/the-thao.rss",
        options: {}
    };

    @node({
        id: "rss-vietnamnet",
        name: "RSS vietnamnet-thethao",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [3136, 1504]
    })
    RssVietnamnetThethao = {
        url: "https://vietnamnet.vn/rss/the-thao.rss",
        options: {}
    };

    @node({
        id: "rss-nld",
        name: "RSS nld-thethao",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [3360, 1672]
    })
    RssNldThethao = {
        url: "https://nld.com.vn/rss/the-thao.rss",
        options: {}
    };

    @node({
        id: "rss-b24h-1",
        name: "RSS bongda24h-1",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [3584, 1840]
    })
    RssBongda24h1 = {
        url: "https://bongda24h.vn/RSS/1.rss",
        options: {}
    };

    @node({
        id: "rss-b24h-168",
        name: "RSS bongda24h-168",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [3808, 2008]
    })
    RssBongda24h168 = {
        url: "https://bongda24h.vn/RSS/168.rss",
        options: {}
    };

    @node({
        id: "rss-tinthethao",
        name: "RSS tinthethao-feed",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [4032, 2176]
    })
    RssTinthethaoFeed = {
        url: "https://www.tinthethao.com.vn/feed.rss",
        options: {}
    };

    @node({
        id: "rss-tinthethao-bd",
        name: "RSS tinthethao-bongda",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [4256, 2344]
    })
    RssTinthethaoBongda = {
        url: "https://www.tinthethao.com.vn/bong-da.rss",
        options: {}
    };

    @node({
        id: "rss-t247-24h",
        name: "RSS thethao247-24h",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [4480, 2512]
    })
    RssThethao24724h = {
        url: "https://thethao247.vn/the-thao-24h.rss",
        options: {}
    };

    @node({
        id: "rss-t247-bd",
        name: "RSS thethao247-bongda",
        type: "n8n-nodes-base.rssFeedRead",
        version: 1,
        position: [4704, 2680]
    })
    RssThethao247Bongda = {
        url: "https://thethao247.vn/bong-da.rss",
        options: {}
    };

    @node({
        id: "merge-1",
        name: "Merge",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [448, -608]
    })
    Merge = {};

    @node({
        id: "merge-2",
        name: "Merge2",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [672, -512]
    })
    Merge2 = {};

    @node({
        id: "merge-3",
        name: "Merge3",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [896, -416]
    })
    Merge3 = {};

    @node({
        id: "merge-4",
        name: "Merge4",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [1120, -320]
    })
    Merge4 = {};

    @node({
        id: "merge-5",
        name: "Merge5",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [1344, -224]
    })
    Merge5 = {};

    @node({
        id: "merge-6",
        name: "Merge6",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [1568, -128]
    })
    Merge6 = {};

    @node({
        id: "merge-7",
        name: "Merge7",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [1792, -32]
    })
    Merge7 = {};

    @node({
        id: "merge-8",
        name: "Merge8",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [2016, 64]
    })
    Merge8 = {};

    @node({
        id: "merge-9",
        name: "Merge9",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [2240, 160]
    })
    Merge9 = {};

    @node({
        id: "merge-10",
        name: "Merge10",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [2464, 256]
    })
    Merge10 = {};

    @node({
        id: "merge-11",
        name: "Merge11",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [2688, 352]
    })
    Merge11 = {};

    @node({
        id: "merge-12",
        name: "Merge12",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [2912, 448]
    })
    Merge12 = {};

    @node({
        id: "merge-13",
        name: "Merge13",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [3136, 448]
    })
    Merge13 = {};

    @node({
        id: "merge-14",
        name: "Merge14",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [3360, 544]
    })
    Merge14 = {};

    @node({
        id: "merge-15",
        name: "Merge15",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [3584, 640]
    })
    Merge15 = {};

    @node({
        id: "merge-16",
        name: "Merge16",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [3808, 736]
    })
    Merge16 = {};

    @node({
        id: "merge-17",
        name: "Merge17",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [4032, 832]
    })
    Merge17 = {};

    @node({
        id: "merge-18",
        name: "Merge18",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [4256, 928]
    })
    Merge18 = {};

    @node({
        id: "merge-19",
        name: "Merge19",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [4480, 1024]
    })
    Merge19 = {};

    @node({
        id: "merge-20",
        name: "Merge20",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [4704, 1120]
    })
    Merge20 = {};

    @node({
        id: "merge-21",
        name: "Merge21",
        type: "n8n-nodes-base.merge",
        version: 3,
        position: [4928, 1216]
    })
    Merge21 = {};

    @node({
        id: "code-normalize",
        name: "Normalize Payload",
        type: "n8n-nodes-base.code",
        version: 2,
        position: [5152, 1216]
    })
    NormalizePayload = {
        jsCode: `const MAX_BODY = 1200;
const parseTime = (s) => {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
};
const items = $input.all();
let rawItems = items.map(i => {
  const body = (i.json.content || i.json.description || i.json.contentSnippet || '').trim();
  return {
    id: i.json.guid || i.json.link,
    title: (i.json.title || '').trim(),
    body: body.length > MAX_BODY ? body.slice(0, MAX_BODY) : body,
    url: i.json.link || i.json.url,
    publishedAt: i.json.isoDate || i.json.pubDate
  };
}).filter(x => x.title && x.body && x.body.length >= 50);
rawItems.sort((a, b) => parseTime(b.publishedAt) - parseTime(a.publishedAt));
if (rawItems.length === 0) {
  return [{ json: { rawItems: [], skip: true } }];
}
return [{
  json: {
    rawItems,
    channel: { id: 'blog-1', type: 'blog', metadata: {} },
    _meta: { rssItemCount: items.length, afterFilter: rawItems.length, sentToTrend: rawItems.length }
  }
}];`
    };

    @node({
        id: "if-skip",
        name: "Skip if Empty?",
        type: "n8n-nodes-base.if",
        version: 2,
        position: [5376, 1216]
    })
    SkipIfEmpty = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: "",
                typeValidation: "strict"
            },
            conditions: [
                {
                    leftValue: "={{ $json.skip }}",
                    rightValue: true,
                    operator: {
                        type: "boolean",
                        operation: "equals"
                    }
                }
            ],
            combinator: "and"
        },
        options: {}
    };

    @node({
        id: "http-trend",
        name: "Call Trend API",
        type: "n8n-nodes-base.httpRequest",
        version: 4.2,
        position: [5600, 1216]
    })
    CallTrendApi = {
        method: "POST",
        url: "http://host.docker.internal:3000/v1/jobs/trend/run",
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: "Content-Type",
                    value: "application/json"
                },
                {
                    name: "Authorization",
                    value: "={{ 'Bearer ' + $env['ORCHESTRATOR_API_KEY'] }}"
                }
            ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({ domain: 'sports-vn', rawItems: $json.rawItems, channel: $json.channel }) }}",
        options: {
            timeout: 60000
        }
    };

    @node({
        id: "http-get-job",
        name: "Get Trend Job",
        type: "n8n-nodes-base.httpRequest",
        version: 4.2,
        position: [5824, 1216]
    })
    GetTrendJob = {
        url: "=http://host.docker.internal:3000/v1/jobs/{{ $json.jobId }}",
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: "Authorization",
                    value: "={{ 'Bearer ' + $env['ORCHESTRATOR_API_KEY'] }}"
                }
            ]
        },
        options: {}
    };

    @node({
        id: "code-split",
        name: "Split Candidates",
        type: "n8n-nodes-base.code",
        version: 2,
        position: [6048, 1216]
    })
    SplitCandidates = {
        jsCode: `const job = $input.first().json;
const trendJobId = $('Call Trend API').item.json.jobId;
const candidates = (job.output?.trendCandidates || []).slice(0, 5);
if (candidates.length === 0) return [];
return candidates.map((_, i) => ({ json: { trendJobId, topicIndex: i } }));`
    };

    @node({
        id: "http-content",
        name: "Call Content API",
        type: "n8n-nodes-base.httpRequest",
        version: 4.2,
        position: [6272, 1216]
    })
    CallContentApi = {
        method: "POST",
        url: "http://host.docker.internal:3000/v1/jobs/content/run",
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: "Content-Type",
                    value: "application/json"
                },
                {
                    name: "Authorization",
                    value: "={{ 'Bearer ' + $env['ORCHESTRATOR_API_KEY'] }}"
                }
            ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify({ sourceType: 'trend', trendJobId: $json.trendJobId, topicIndex: $json.topicIndex, publishPolicy: 'auto', channel: { id: 'blog-1', type: 'blog', metadata: {} } }) }}",
        options: {
            timeout: 120000
        }
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
        this.ManualTrigger.out(0).to(this.RssVnexpressThethao.in(0));
        this.ManualTrigger.out(0).to(this.RssTuoitreThethao.in(0));
        this.ManualTrigger.out(0).to(this.RssDantriThethao.in(0));
        this.ManualTrigger.out(0).to(this.RssZingnewsThethao.in(0));
        this.ManualTrigger.out(0).to(this.RssBongdaFeed.in(0));
        this.ManualTrigger.out(0).to(this.RssBongdaVietnam.in(0));
        this.ManualTrigger.out(0).to(this.RssBongdaVleague.in(0));
        this.ManualTrigger.out(0).to(this.RssBongdaChuyennhuong.in(0));
        this.ManualTrigger.out(0).to(this.RssBongdaC1.in(0));
        this.ManualTrigger.out(0).to(this.RssBongdaAnh.in(0));
        this.ManualTrigger.out(0).to(this.RssBongdaAff.in(0));
        this.ManualTrigger.out(0).to(this.RssBongdaWorldcup.in(0));
        this.ManualTrigger.out(0).to(this.RssThanhnienThethao.in(0));
        this.ManualTrigger.out(0).to(this.RssVietnamnetThethao.in(0));
        this.ManualTrigger.out(0).to(this.RssNldThethao.in(0));
        this.ManualTrigger.out(0).to(this.RssBongda24h1.in(0));
        this.ManualTrigger.out(0).to(this.RssBongda24h168.in(0));
        this.ManualTrigger.out(0).to(this.RssTinthethaoFeed.in(0));
        this.ManualTrigger.out(0).to(this.RssTinthethaoBongda.in(0));
        this.ManualTrigger.out(0).to(this.RssThethao24724h.in(0));
        this.ManualTrigger.out(0).to(this.RssThethao247Bongda.in(0));
        this.RssVnexpressThethao.out(0).to(this.Merge.in(0));
        this.RssTuoitreThethao.out(0).to(this.Merge.in(1));
        this.Merge.out(0).to(this.Merge2.in(0));
        this.RssDantriThethao.out(0).to(this.Merge2.in(1));
        this.Merge2.out(0).to(this.Merge3.in(0));
        this.RssZingnewsThethao.out(0).to(this.Merge3.in(1));
        this.Merge3.out(0).to(this.Merge4.in(0));
        this.RssBongdaFeed.out(0).to(this.Merge4.in(1));
        this.Merge4.out(0).to(this.Merge5.in(0));
        this.RssBongdaVietnam.out(0).to(this.Merge5.in(1));
        this.Merge5.out(0).to(this.Merge6.in(0));
        this.RssBongdaVleague.out(0).to(this.Merge6.in(1));
        this.Merge6.out(0).to(this.Merge7.in(0));
        this.RssBongdaChuyennhuong.out(0).to(this.Merge7.in(1));
        this.Merge7.out(0).to(this.Merge8.in(0));
        this.RssBongdaC1.out(0).to(this.Merge8.in(1));
        this.Merge8.out(0).to(this.Merge9.in(0));
        this.RssBongdaAnh.out(0).to(this.Merge9.in(1));
        this.Merge9.out(0).to(this.Merge10.in(0));
        this.RssBongdaAff.out(0).to(this.Merge10.in(1));
        this.Merge10.out(0).to(this.Merge11.in(0));
        this.RssBongdaWorldcup.out(0).to(this.Merge11.in(1));
        this.Merge11.out(0).to(this.Merge12.in(0));
        this.Merge12.out(0).to(this.Merge13.in(0));
        this.RssThanhnienThethao.out(0).to(this.Merge12.in(1));
        this.Merge13.out(0).to(this.Merge14.in(0));
        this.RssVietnamnetThethao.out(0).to(this.Merge14.in(1));
        this.Merge14.out(0).to(this.Merge15.in(0));
        this.RssNldThethao.out(0).to(this.Merge15.in(1));
        this.Merge15.out(0).to(this.Merge16.in(0));
        this.RssBongda24h1.out(0).to(this.Merge16.in(1));
        this.Merge16.out(0).to(this.Merge17.in(0));
        this.RssBongda24h168.out(0).to(this.Merge17.in(1));
        this.Merge17.out(0).to(this.Merge18.in(0));
        this.RssTinthethaoFeed.out(0).to(this.Merge18.in(1));
        this.Merge18.out(0).to(this.Merge19.in(0));
        this.RssTinthethaoBongda.out(0).to(this.Merge19.in(1));
        this.Merge19.out(0).to(this.Merge20.in(0));
        this.RssThethao24724h.out(0).to(this.Merge20.in(1));
        this.Merge20.out(0).to(this.Merge21.in(0));
        this.RssThethao247Bongda.out(0).to(this.Merge21.in(1));
        this.Merge21.out(0).to(this.NormalizePayload.in(0));
        this.NormalizePayload.out(0).to(this.SkipIfEmpty.in(0));
        this.SkipIfEmpty.out(1).to(this.CallTrendApi.in(0));
        this.CallTrendApi.out(0).to(this.GetTrendJob.in(0));
        this.GetTrendJob.out(0).to(this.SplitCandidates.in(0));
        this.SplitCandidates.out(0).to(this.CallContentApi.in(0));
    }
}