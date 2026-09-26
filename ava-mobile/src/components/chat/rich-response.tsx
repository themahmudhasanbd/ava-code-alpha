import React, { memo, useMemo, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import Svg, {
  Circle as SvgCircle,
  Defs,
  G,
  Line as SvgLine,
  LinearGradient,
  Path as SvgPath,
  Rect as SvgRect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import * as Clipboard from "expo-clipboard";
import {
  BarChart3,
  Check,
  CheckSquare,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  GitGraph,
  LineChart as LineChartIcon,
  Maximize2,
  PieChart as PieChartIcon,
  RotateCcw,
  Square,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react-native";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { Surface } from "@/components/kit";
import { COLORS } from "@/theme/colors";
import { font, FONTS, mono } from "@/theme/fonts";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ============================================================================
// 1. INLINE TOKENIZER & FORMATTING
// ============================================================================

interface InlineToken {
  type:
    | "text"
    | "bold"
    | "italic"
    | "boldItalic"
    | "code"
    | "strike"
    | "link"
    | "math";
  content: string;
  url?: string;
}

export function parseInlineFormatting(rawText: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*\*([^*]+)\*\*\*|___([^_]+)___|\*\*([^*]+)\*\*|__([^_]+)__|\*([^\*\n]+)\*|_([^\_\n]+)_|~~([^~]+)~~|`([^`\n]+)`|\$([^\$\n]+)\$/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        content: rawText.slice(lastIndex, match.index),
      });
    }

    if (match[1] && match[2]) {
      tokens.push({ type: "link", content: match[1], url: match[2] });
    } else if (match[3] || match[4]) {
      tokens.push({ type: "boldItalic", content: match[3] || match[4] });
    } else if (match[5] || match[6]) {
      tokens.push({ type: "bold", content: match[5] || match[6] });
    } else if (match[7] || match[8]) {
      tokens.push({ type: "italic", content: match[7] || match[8] });
    } else if (match[9]) {
      tokens.push({ type: "strike", content: match[9] });
    } else if (match[10]) {
      tokens.push({ type: "code", content: match[10] });
    } else if (match[11]) {
      tokens.push({ type: "math", content: match[11] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    tokens.push({ type: "text", content: rawText.slice(lastIndex) });
  }

  return tokens;
}

export function InlineText({
  text,
  style,
  isUser = false,
}: {
  text: string;
  style?: any;
  isUser?: boolean;
}) {
  const tokens = parseInlineFormatting(text);

  const handleOpenUrl = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <Text
      style={[
        styles.inlineBaseText,
        font("regular", text),
        isUser && styles.inlineBaseTextUser,
        style,
      ]}
    >
      {tokens.map((tok, i) => {
        if (tok.type === "link") {
          return (
            <Text
              key={i}
              style={[
                styles.linkText,
                font("medium", tok.content),
                isUser && styles.linkTextUser,
              ]}
              onPress={() => handleOpenUrl(tok.url)}
            >
              {tok.content}
            </Text>
          );
        }
        if (tok.type === "boldItalic") {
          return (
            <Text
              key={i}
              style={[
                styles.boldItalicText,
                font("bold", tok.content),
                isUser && styles.boldTextUser,
              ]}
            >
              {tok.content}
            </Text>
          );
        }
        if (tok.type === "bold") {
          return (
            <Text
              key={i}
              style={[
                styles.boldText,
                font("bold", tok.content),
                isUser && styles.boldTextUser,
              ]}
            >
              {tok.content}
            </Text>
          );
        }
        if (tok.type === "italic") {
          return (
            <Text
              key={i}
              style={[
                styles.italicText,
                font("regular", tok.content),
                isUser && styles.italicTextUser,
              ]}
            >
              {tok.content}
            </Text>
          );
        }
        if (tok.type === "strike") {
          return (
            <Text
              key={i}
              style={[styles.strikeText, isUser && styles.strikeTextUser]}
            >
              {tok.content}
            </Text>
          );
        }
        if (tok.type === "code") {
          return (
            <Text
              key={i}
              style={[
                styles.inlineCodeText,
                mono("medium"),
                isUser && styles.inlineCodeTextUser,
              ]}
            >
              {` ${tok.content} `}
            </Text>
          );
        }
        if (tok.type === "math") {
          return (
            <Text
              key={i}
              style={[
                styles.inlineMathText,
                mono("medium"),
                isUser && styles.inlineMathTextUser,
              ]}
            >
              {tok.content}
            </Text>
          );
        }
        return <Text key={i}>{tok.content}</Text>;
      })}
    </Text>
  );
}

// ============================================================================
// 2. MERMAID DIAGRAM RENDERER (WITH FULL PAN, PINCH-TO-ZOOM, BUTTONS & FULLSCREEN)
// ============================================================================

const MERMAID_KEYWORDS = [
  "graph",
  "flowchart",
  "sequencediagram",
  "classdiagram",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "gantt",
  "pie",
  "gitgraph",
  "journey",
  "mindmap",
  "quadrantchart",
  "requirementdiagram",
  "c4context",
  "timeline",
  "sankey-beta",
  "packet-beta",
];

export function isMermaidCode(code: string, language?: string): boolean {
  if (
    language &&
    (language.toLowerCase() === "mermaid" ||
      language.toLowerCase() === "flowchart")
  ) {
    return true;
  }
  const firstLine =
    code.trim().split("\n")[0]?.toLowerCase().trim().replace(/[:\s].*/, "") ??
    "";
  return MERMAID_KEYWORDS.some(
    (kw) => firstLine.startsWith(kw) || kw.startsWith(firstLine)
  );
}

function getDiagramTypeLabel(code: string): string {
  const firstLine = code.trim().split("\n")[0]?.toLowerCase().trim() ?? "";
  if (firstLine.startsWith("sequencediagram")) return "Sequence Diagram";
  if (firstLine.startsWith("classdiagram")) return "Class Diagram";
  if (firstLine.startsWith("statediagram")) return "State Diagram";
  if (firstLine.startsWith("erdiagram")) return "ER Diagram";
  if (firstLine.startsWith("gantt")) return "Gantt Timeline";
  if (firstLine.startsWith("pie")) return "Pie Chart";
  if (firstLine.startsWith("gitgraph")) return "Git Graph";
  if (firstLine.startsWith("mindmap")) return "Mindmap";
  if (firstLine.startsWith("flowchart") || firstLine.startsWith("graph"))
    return "Flowchart / Architecture";
  return "Mermaid Diagram";
}

function buildMermaidHtml(diagramCode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-user-select: none; user-select: none; }
    html, body {
      background-color: transparent !important;
      color: ${COLORS.foreground};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #viewport {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
      touch-action: none;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #panzoom-layer {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      transform-origin: center center;
      transition: transform 0.1s ease-out;
      will-change: transform;
      padding: 4px;
      max-width: 100%;
    }
    .mermaid {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }
    svg {
      max-width: 100% !important;
      max-height: 220px !important;
      height: auto !important;
      display: block;
      margin: 0 auto;
    }
    .node rect, .node circle, .node ellipse, .node polygon, .node path {
      fill: ${COLORS.secondary} !important;
      stroke: ${COLORS.border} !important;
      stroke-width: 1px !important;
      rx: 5px !important;
      ry: 5px !important;
    }
    .node .label, .node text {
      fill: ${COLORS.foreground} !important;
      font-weight: 500 !important;
      font-size: 10.5px !important;
      line-height: 1.2 !important;
    }
    .edgePath .path {
      stroke: ${COLORS.mutedForeground} !important;
      stroke-width: 1.2px !important;
    }
    .edgeLabel {
      background-color: ${COLORS.card} !important;
      color: ${COLORS.mutedForeground} !important;
      font-size: 9.5px !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      border: 1px solid ${COLORS.border} !important;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="viewport">
    <div id="panzoom-layer">
      <div id="diagram" class="mermaid"></div>
    </div>
  </div>

  <script>
    (function() {
      var rawCode = ${JSON.stringify(diagramCode)};
      var el = document.getElementById('diagram');
      var layer = document.getElementById('panzoom-layer');
      var viewport = document.getElementById('viewport');
      el.textContent = rawCode;

      var currentScale = 1.0;
      var posX = 0;
      var posY = 0;

      function updateTransform(notify) {
        layer.style.transform = 'translate(' + posX + 'px, ' + posY + 'px) scale(' + currentScale + ')';
        if (notify && window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ZOOM_CHANGE',
            zoom: Math.round(currentScale * 100)
          }));
        }
      }

      window.zoomIn = function() {
        currentScale = Math.min(3.5, +(currentScale + 0.25).toFixed(2));
        updateTransform(true);
      };

      window.zoomOut = function() {
        currentScale = Math.max(0.4, +(currentScale - 0.25).toFixed(2));
        updateTransform(true);
      };

      window.resetZoom = function() {
        currentScale = 1.0;
        posX = 0;
        posY = 0;
        updateTransform(true);
      };

      // Touch Pan & Pinch to Zoom
      var startDist = 0;
      var startScale = 1.0;
      var startX = 0;
      var startY = 0;
      var isDragging = false;
      var lastTap = 0;

      viewport.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
          var dx = e.touches[0].clientX - e.touches[1].clientX;
          var dy = e.touches[0].clientY - e.touches[1].clientY;
          startDist = Math.hypot(dx, dy);
          startScale = currentScale;
        } else if (e.touches.length === 1) {
          isDragging = true;
          startX = e.touches[0].clientX - posX;
          startY = e.touches[0].clientY - posY;
        }
      }, { passive: false });

      viewport.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2 && startDist > 0) {
          e.preventDefault();
          var dx = e.touches[0].clientX - e.touches[1].clientX;
          var dy = e.touches[0].clientY - e.touches[1].clientY;
          var dist = Math.hypot(dx, dy);
          var factor = dist / startDist;
          currentScale = Math.min(3.5, Math.max(0.4, +(startScale * factor).toFixed(2)));
          updateTransform(true);
        } else if (e.touches.length === 1 && isDragging) {
          e.preventDefault();
          posX = e.touches[0].clientX - startX;
          posY = e.touches[0].clientY - startY;
          updateTransform(false);
        }
      }, { passive: false });

      viewport.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) startDist = 0;
        if (e.touches.length === 0) isDragging = false;
        var now = Date.now();
        if (now - lastTap < 300) {
          if (currentScale > 1.2) {
            window.resetZoom();
          } else {
            currentScale = 1.6;
            updateTransform(true);
          }
        }
        lastTap = now;
      });

      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          themeVariables: {
            primaryColor: '${COLORS.secondary}',
            primaryTextColor: '${COLORS.foreground}',
            primaryBorderColor: '${COLORS.border}',
            lineColor: '${COLORS.mutedForeground}',
            secondaryColor: '${COLORS.card}',
            tertiaryColor: '${COLORS.card}',
            mainBkg: '${COLORS.card}',
            nodeBorder: '${COLORS.border}',
            nodeTextColor: '${COLORS.foreground}',
            clusterBkg: '${COLORS.secondary}',
            clusterBorder: '${COLORS.border}',
            titleColor: '${COLORS.foreground}',
            edgeLabelBackground: '${COLORS.card}',
            fontSize: '10.5px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          },
          securityLevel: 'loose',
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 4,
            nodeSpacing: 18,
            rankSpacing: 22,
            useMaxWidth: true
          },
          sequence: {
            actorFontSize: 11,
            messageFontSize: 10,
            noteFontSize: 10,
            width: 105,
            height: 32,
            boxMargin: 4,
            boxTextMargin: 3,
            noteMargin: 4,
            messageMargin: 16
          }
        });

        mermaid.run({
          nodes: [el]
        }).then(function() {
          setTimeout(function() {
            var svg = document.querySelector('svg');
            var height = 90;
            if (svg) {
              svg.style.maxWidth = '100%';
              svg.style.maxHeight = '220px';
              svg.style.height = 'auto';
              var bbox = svg.getBoundingClientRect();
              height = Math.ceil(bbox.height || 90);
            } else {
              height = Math.ceil(document.body.scrollHeight || 90);
            }
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'RENDER_SUCCESS',
                height: height
              }));
            }
          }, 120);
        }).catch(function(err) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'RENDER_ERROR',
              message: err && err.message ? err.message : String(err)
            }));
          }
        });
      } catch(err) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'RENDER_ERROR',
            message: err && err.message ? err.message : String(err)
          }));
        }
      }
    })();
  </script>
</body>
</html>`;
}

function MermaidBlock({ code }: { code: string }) {
  const [viewMode, setViewMode] = useState<"diagram" | "code">("diagram");
  const [copied, setCopied] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(90);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const webViewRef = useRef<WebView>(null);
  const fullscreenWebViewRef = useRef<WebView>(null);

  const diagramLabel = useMemo(() => getDiagramTypeLabel(code), [code]);
  const html = useMemo(() => buildMermaidHtml(code), [code]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomIn = () => {
    webViewRef.current?.injectJavaScript("window.zoomIn && window.zoomIn(); true;");
    fullscreenWebViewRef.current?.injectJavaScript("window.zoomIn && window.zoomIn(); true;");
  };

  const handleZoomOut = () => {
    webViewRef.current?.injectJavaScript("window.zoomOut && window.zoomOut(); true;");
    fullscreenWebViewRef.current?.injectJavaScript("window.zoomOut && window.zoomOut(); true;");
  };

  const handleResetZoom = () => {
    webViewRef.current?.injectJavaScript("window.resetZoom && window.resetZoom(); true;");
    fullscreenWebViewRef.current?.injectJavaScript("window.resetZoom && window.resetZoom(); true;");
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "RENDER_SUCCESS") {
        setIsLoading(false);
        setHasError(false);
        if (typeof data.height === "number" && data.height > 30) {
          setWebViewHeight(Math.max(50, Math.min(220, data.height + 8)));
        }
      } else if (data.type === "RENDER_ERROR") {
        setIsLoading(false);
        setHasError(true);
      } else if (data.type === "ZOOM_CHANGE") {
        if (typeof data.zoom === "number") {
          setZoomLevel(data.zoom);
        }
      }
    } catch {}
  };

  return (
    <Surface style={styles.mermaidCard}>
      <View style={styles.mermaidHeader}>
        <View style={styles.mermaidLabelGroup}>
          <View style={styles.mermaidIconTag}>
            <GitGraph size={13} color={COLORS.primary} />
          </View>
          <Text style={[styles.mermaidHeaderText, font("semibold")]} numberOfLines={1}>
            {diagramLabel}
          </Text>
        </View>

        <View style={styles.mermaidActionsRow}>
          <TouchableOpacity
            style={styles.mermaidActionBtn}
            onPress={() =>
              setViewMode(viewMode === "diagram" ? "code" : "diagram")
            }
            activeOpacity={0.7}
          >
            {viewMode === "diagram" ? (
              <Code2 size={12} color={COLORS.mutedForeground} />
            ) : (
              <Eye size={12} color={COLORS.primary} />
            )}
            <Text
              style={[
                styles.mermaidActionBtnText,
                font("medium"),
                viewMode === "code" && { color: COLORS.primary },
              ]}
            >
              {viewMode === "diagram" ? "Code" : "Diagram"}
            </Text>
          </TouchableOpacity>

          {viewMode === "diagram" && !hasError && (
            <TouchableOpacity
              style={styles.mermaidActionBtn}
              onPress={() => setFullscreenOpen(true)}
              activeOpacity={0.7}
            >
              <Maximize2 size={12} color={COLORS.mutedForeground} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.mermaidActionBtn}
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            {copied ? (
              <Check size={12} color={COLORS.success} />
            ) : (
              <Copy size={12} color={COLORS.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === "code" || hasError ? (
        <View style={styles.mermaidCodeFallback}>
          {hasError && (
            <View style={styles.mermaidErrorBanner}>
              <Text style={[styles.mermaidErrorText, font("regular")]}>
                Diagram syntax fallback (displaying source)
              </Text>
            </View>
          )}
          <CodeBlock code={code} language="mermaid" />
        </View>
      ) : (
        <View
          style={[styles.mermaidWebViewContainer, { height: webViewHeight }]}
        >
          {isLoading && (
            <View style={styles.mermaidLoaderBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html }}
            style={styles.mermaidWebView}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            onMessage={handleMessage}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />

          {/* Floating HUD Zoom Controls */}
          <View style={styles.mermaidFloatingControls}>
            <TouchableOpacity
              style={styles.floatingZoomBtn}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <ZoomOut size={13} color={COLORS.foreground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.floatingZoomResetBtn}
              onPress={handleResetZoom}
              activeOpacity={0.7}
            >
              <Text style={[styles.floatingZoomText, mono("bold")]}>
                {zoomLevel}%
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.floatingZoomBtn}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <ZoomIn size={13} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Fullscreen Modal View */}
      <Modal
        visible={fullscreenOpen}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setFullscreenOpen(false)}
      >
        <View style={styles.fullscreenBackdrop}>
          <BlurView
            intensity={85}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.fullscreenHeader}>
            <View style={styles.mermaidLabelGroup}>
              <GitGraph size={15} color={COLORS.primary} />
              <Text style={[styles.fullscreenTitle, font("semibold")]}>
                {diagramLabel}
              </Text>
            </View>

            <View style={styles.fullscreenZoomRow}>
              <TouchableOpacity
                style={styles.fullscreenZoomBtn}
                onPress={handleZoomOut}
                activeOpacity={0.7}
              >
                <ZoomOut size={15} color={COLORS.foreground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullscreenZoomBtn}
                onPress={handleResetZoom}
                activeOpacity={0.7}
              >
                <RotateCcw size={14} color={COLORS.foreground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullscreenZoomBtn}
                onPress={handleZoomIn}
                activeOpacity={0.7}
              >
                <ZoomIn size={15} color={COLORS.foreground} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFullscreenOpen(false)}
                style={styles.fullscreenCloseBtn}
                activeOpacity={0.7}
              >
                <X size={18} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fullscreenWebViewBox}>
            <WebView
              ref={fullscreenWebViewRef}
              originWhitelist={["*"]}
              source={{ html }}
              style={styles.fullscreenWebView}
              javaScriptEnabled
              domStorageEnabled
              scalesPageToFit={Platform.OS === "android"}
              onMessage={handleMessage}
            />
          </View>
        </View>
      </Modal>
    </Surface>
  );
}

// ============================================================================
// 3. MATH & LATEX EQUATION RENDERER
// ============================================================================

function buildMathHtml(formula: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background-color: transparent !important;
      color: ${COLORS.foreground} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      padding: 6px 10px;
      overflow: hidden;
    }
    #math-output {
      width: 100%;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .katex {
      color: ${COLORS.foreground} !important;
      font-size: 1.15em !important;
    }
    .katex-html, .katex .base {
      color: ${COLORS.foreground} !important;
    }
    .katex-display {
      margin: 0 !important;
    }
  </style>
</head>
<body>
  <div id="math-output"></div>
  <script>
    (function() {
      var rawFormula = ${JSON.stringify(formula)};
      var out = document.getElementById('math-output');
      try {
        if (typeof katex !== 'undefined') {
          katex.render(rawFormula, out, {
            displayMode: true,
            throwOnError: false
          });
        } else {
          out.innerText = rawFormula;
        }
      } catch(err) {
        out.innerText = rawFormula;
      }
      function sendHeight() {
        var h = document.body.scrollHeight || out.offsetHeight || 44;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ height: Math.ceil(h) }));
        }
      }
      setTimeout(sendHeight, 50);
      setTimeout(sendHeight, 250);
    })();
  </script>
</body>
</html>`;
}

function MathBlock({ formula }: { formula: string }) {
  const [height, setHeight] = useState(54);
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => buildMathHtml(formula), [formula]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(formula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Surface style={styles.mathCard}>
      <View style={styles.mathHeaderRow}>
        <View style={styles.mathBadge}>
          <Text style={[styles.mathBadgeText, mono("bold")]}>TeX</Text>
        </View>
        <TouchableOpacity
          onPress={handleCopy}
          style={styles.mathCopyBtn}
          activeOpacity={0.7}
        >
          {copied ? (
            <Check size={12} color={COLORS.success} />
          ) : (
            <Copy size={12} color={COLORS.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>
      <View style={[styles.mathWebViewBox, { height }]}>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          style={styles.mathWebView}
          scrollEnabled={false}
          javaScriptEnabled
          onMessage={(e) => {
            try {
              const data = JSON.parse(e.nativeEvent.data);
              if (data.height)
                setHeight(Math.max(44, Math.min(260, data.height + 10)));
            } catch {}
          }}
        />
      </View>
    </Surface>
  );
}

// ============================================================================
// 4. GFM MARKDOWN TABLE VIEW
// ============================================================================

interface ParsedTable {
  headers: string[];
  aligns: ("left" | "center" | "right")[];
  rows: string[][];
}

function parseTableLine(line: string): string[] {
  const trimmed = line.trim();
  const stripped = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return stripped.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableLine(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-+:?$/.test(cell.replace(/\s+/g, "")))
  );
}

function MarkdownTable({
  table,
  isUser = false,
}: {
  table: ParsedTable;
  isUser?: boolean;
}) {
  return (
    <Surface style={[styles.tableCard, isUser && styles.tableCardUser]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableGrid}>
          <View
            style={[
              styles.tableHeaderRow,
              isUser && styles.tableHeaderRowUser,
            ]}
          >
            {table.headers.map((h, i) => (
              <View
                key={i}
                style={[
                  styles.tableHeaderCell,
                  table.aligns[i] === "center" && styles.cellCenter,
                  table.aligns[i] === "right" && styles.cellRight,
                ]}
              >
                <InlineText
                  text={h}
                  style={
                    isUser
                      ? styles.tableHeaderTextUser
                      : styles.tableHeaderText
                  }
                  isUser={isUser}
                />
              </View>
            ))}
          </View>

          {table.rows.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={[
                styles.tableRow,
                rowIdx % 2 === 1 &&
                  (isUser ? styles.tableRowAltUser : styles.tableRowAlt),
                rowIdx === table.rows.length - 1 && styles.tableRowLast,
              ]}
            >
              {table.headers.map((_, colIdx) => (
                <View
                  key={colIdx}
                  style={[
                    styles.tableCell,
                    table.aligns[colIdx] === "center" && styles.cellCenter,
                    table.aligns[colIdx] === "right" && styles.cellRight,
                  ]}
                >
                  <InlineText
                    text={row[colIdx] || ""}
                    style={
                      isUser
                        ? styles.tableCellTextUser
                        : styles.tableCellText
                    }
                    isUser={isUser}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Surface>
  );
}

// ============================================================================
// 5. VISUAL CHARTS (EXACT RECHARTS CLONE: PIE, BAR, LINE, AREA)
// ============================================================================

export interface ChartSpec {
  type?: "bar" | "horizontalBar" | "line" | "area" | "pie" | "donut";
  title?: string;
  data: Record<string, string | number>[];
  xKey?: string;
  yKeys?: string[];
}

const COLORS_RECHARTS = [
  "#6366F1", // var(--chart-1)
  "#06B6D4", // var(--chart-2)
  "#EAB308", // var(--chart-3)
  "#D946EF", // var(--chart-4)
  "#F43F5E", // var(--chart-5)
  "#10B981",
  "#3B82F6",
];

function createPieSlicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const angleDiff = endAngle - startAngle;
  if (angleDiff >= 2 * Math.PI - 0.0001) {
    const midAngle = startAngle + Math.PI;
    const path1 = createPieSlicePath(
      cx,
      cy,
      outerRadius,
      innerRadius,
      startAngle,
      midAngle
    );
    const path2 = createPieSlicePath(
      cx,
      cy,
      outerRadius,
      innerRadius,
      midAngle,
      endAngle
    );
    return `${path1} ${path2}`;
  }

  const x1Outer = cx + outerRadius * Math.cos(startAngle);
  const y1Outer = cy + outerRadius * Math.sin(startAngle);
  const x2Outer = cx + outerRadius * Math.cos(endAngle);
  const y2Outer = cy + outerRadius * Math.sin(endAngle);

  const largeArcFlag = angleDiff > Math.PI ? 1 : 0;

  if (innerRadius <= 0) {
    return `M ${cx} ${cy} L ${x1Outer} ${y1Outer} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer} Z`;
  }

  const x1Inner = cx + innerRadius * Math.cos(startAngle);
  const y1Inner = cy + innerRadius * Math.sin(startAngle);
  const x2Inner = cx + innerRadius * Math.cos(endAngle);
  const y2Inner = cy + innerRadius * Math.sin(endAngle);

  return `M ${x1Outer} ${y1Outer} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer} L ${x2Inner} ${y2Inner} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner} Z`;
}

function ChartBlock({ spec }: { spec: ChartSpec }) {
  const [selectedSliceIndex, setSelectedSliceIndex] = useState<number | null>(
    null
  );

  const items = spec.data || [];
  if (!items.length) return null;

  const first = items[0] ?? {};
  const xKey =
    spec.xKey ??
    Object.keys(first).find((k) => typeof first[k] === "string") ??
    "name";

  const yKeys =
    spec.yKeys && spec.yKeys.length > 0
      ? spec.yKeys
      : Object.keys(first).filter(
          (k) => k !== xKey && typeof first[k] === "number"
        );

  const primaryNumKey = yKeys[0] || "value";
  const chartType = spec.type || "bar";

  const totalVal = items.reduce(
    (acc, it) =>
      acc +
      (typeof it[primaryNumKey] === "number"
        ? Number(it[primaryNumKey])
        : 0),
    0
  );

  const maxVal = Math.max(
    ...items.flatMap((it) =>
      yKeys.map((yk) =>
        typeof it[yk] === "number" ? Number(it[yk]) : 0
      )
    ),
    1
  );

  const pieSlices = useMemo(() => {
    if (chartType !== "pie" && chartType !== "donut") return [];
    let currentAngle = -Math.PI / 2;
    return items.map((it, idx) => {
      const val =
        typeof it[primaryNumKey] === "number"
          ? Math.max(0, Number(it[primaryNumKey]))
          : 0;
      const angleSpan = totalVal > 0 ? (val / totalVal) * (2 * Math.PI) : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSpan;
      currentAngle = endAngle;
      const pct = totalVal > 0 ? (val / totalVal) * 100 : 0;
      const label = String(it[xKey] ?? `Item ${idx + 1}`);
      const color = COLORS_RECHARTS[idx % COLORS_RECHARTS.length];

      return {
        index: idx,
        label,
        val,
        pct,
        startAngle,
        endAngle,
        color,
      };
    });
  }, [items, chartType, primaryNumKey, totalVal, xKey]);

  const activeSlice =
    selectedSliceIndex !== null && pieSlices[selectedSliceIndex]
      ? pieSlices[selectedSliceIndex]
      : null;

  return (
    <Surface style={styles.chartCard}>
      {/* Title */}
      {spec.title && (
        <Text style={[styles.chartTitle, font("medium")]}>
          {spec.title}
        </Text>
      )}

      <View style={styles.chartBody}>
        {/* 1. PIE / DONUT CHART */}
        {chartType === "pie" || chartType === "donut" ? (
          <View style={styles.circularPieContainer}>
            <View style={styles.pieSvgWrapper}>
              <Svg width={180} height={180} viewBox="0 0 200 200">
                <G>
                  {pieSlices.map((slice) => {
                    const isSelected = selectedSliceIndex === slice.index;
                    const outerRadius = isSelected ? 86 : 80;
                    const innerRadius = chartType === "pie" ? 0 : 44;
                    const pathData = createPieSlicePath(
                      100,
                      100,
                      outerRadius,
                      innerRadius,
                      slice.startAngle,
                      slice.endAngle
                    );

                    return (
                      <SvgPath
                        key={slice.index}
                        d={pathData}
                        fill={slice.color}
                        stroke={COLORS.card}
                        strokeWidth={2}
                        opacity={
                          selectedSliceIndex === null || isSelected ? 1 : 0.5
                        }
                        onPress={() =>
                          setSelectedSliceIndex(
                            selectedSliceIndex === slice.index
                              ? null
                              : slice.index
                          )
                        }
                      />
                    );
                  })}
                </G>
              </Svg>

              {chartType !== "pie" && (
                <View style={styles.pieCenterOverlay} pointerEvents="none">
                  <Text
                    style={[styles.pieCenterValue, mono("bold")]}
                    numberOfLines={1}
                  >
                    {activeSlice ? activeSlice.val : totalVal}
                  </Text>
                  <Text
                    style={[styles.pieCenterLabel, font("medium")]}
                    numberOfLines={1}
                  >
                    {activeSlice
                      ? `${activeSlice.pct.toFixed(0)}%`
                      : "Total"}
                  </Text>
                </View>
              )}
            </View>

            {/* Legend Grid */}
            <View style={styles.legendGrid}>
              {pieSlices.map((slice) => {
                const isSelected = selectedSliceIndex === slice.index;
                return (
                  <TouchableOpacity
                    key={slice.index}
                    style={[
                      styles.legendItem,
                      isSelected && styles.legendItemSelected,
                    ]}
                    onPress={() =>
                      setSelectedSliceIndex(
                        selectedSliceIndex === slice.index
                          ? null
                          : slice.index
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: slice.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendLabel,
                        font(isSelected ? "bold" : "medium", slice.label),
                        isSelected && { color: COLORS.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {slice.label}
                    </Text>
                    <Text
                      style={[
                        styles.legendValue,
                        mono("medium"),
                        isSelected && { color: COLORS.primary },
                      ]}
                    >
                      {slice.val} ({slice.pct.toFixed(1)}%)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : chartType === "line" || chartType === "area" ? (
          /* 2. LINE / AREA CHART */
          <View style={styles.svgChartContainer}>
            <Svg width="100%" height={160} viewBox="0 0 320 160">
              <Defs>
                <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0%"
                    stopColor={COLORS.primary}
                    stopOpacity="0.30"
                  />
                  <Stop
                    offset="100%"
                    stopColor={COLORS.primary}
                    stopOpacity="0.02"
                  />
                </LinearGradient>
              </Defs>

              {[0, 0.33, 0.66, 1].map((pct, i) => {
                const y = 135 - pct * 110;
                const labelVal = Math.round(pct * maxVal);
                return (
                  <G key={i}>
                    <SvgLine
                      x1="32"
                      y1={y}
                      x2="310"
                      y2={y}
                      stroke={COLORS.border}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <SvgText
                      x="4"
                      y={y + 3}
                      fill={COLORS.mutedForeground}
                      fontSize="9"
                      fontFamily={FONTS.monoRegular}
                    >
                      {labelVal >= 1000
                        ? `${(labelVal / 1000).toFixed(1)}k`
                        : labelVal}
                    </SvgText>
                  </G>
                );
              })}

              {yKeys.map((yk, keyIdx) => {
                const strokeColor =
                  COLORS_RECHARTS[keyIdx % COLORS_RECHARTS.length];
                const points = items.map((it, idx) => {
                  const val =
                    typeof it[yk] === "number" ? Number(it[yk]) : 0;
                  const x =
                    38 + (idx / Math.max(1, items.length - 1)) * 262;
                  const y = 135 - (val / maxVal) * 110;
                  return { x, y, val };
                });

                const pathD = points.reduce((acc, p, i) => {
                  return i === 0
                    ? `M ${p.x} ${p.y}`
                    : `${acc} L ${p.x} ${p.y}`;
                }, "");

                const areaD =
                  chartType === "area" && points.length > 0
                    ? `${pathD} L ${points[points.length - 1].x} 135 L ${points[0].x} 135 Z`
                    : "";

                return (
                  <G key={yk}>
                    {chartType === "area" && areaD && (
                      <SvgPath d={areaD} fill="url(#areaGrad)" />
                    )}
                    <SvgPath
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                    />
                    {points.map((p, pIdx) => (
                      <G key={pIdx}>
                        <SvgCircle
                          cx={p.x}
                          cy={p.y}
                          r="3"
                          fill={COLORS.card}
                          stroke={strokeColor}
                          strokeWidth="2"
                        />
                      </G>
                    ))}
                  </G>
                );
              })}
            </Svg>

            <View style={styles.xAxisRow}>
              {items.map((it, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.xAxisLabel,
                    font("medium", String(it[xKey])),
                  ]}
                  numberOfLines={1}
                >
                  {String(it[xKey] ?? "")}
                </Text>
              ))}
            </View>

            {yKeys.length > 1 && (
              <View style={styles.multiSeriesLegend}>
                {yKeys.map((yk, idx) => (
                  <View key={yk} style={styles.multiSeriesLegendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor:
                            COLORS_RECHARTS[idx % COLORS_RECHARTS.length],
                        },
                      ]}
                    />
                    <Text style={[styles.legendLabel, font("medium", yk)]}>
                      {yk}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* 3. VERTICAL BAR CHART */
          <View style={styles.svgChartContainer}>
            <Svg width="100%" height={160} viewBox="0 0 320 160">
              {[0, 0.33, 0.66, 1].map((pct, i) => {
                const y = 135 - pct * 110;
                const labelVal = Math.round(pct * maxVal);
                return (
                  <G key={i}>
                    <SvgLine
                      x1="32"
                      y1={y}
                      x2="310"
                      y2={y}
                      stroke={COLORS.border}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <SvgText
                      x="4"
                      y={y + 3}
                      fill={COLORS.mutedForeground}
                      fontSize="9"
                      fontFamily={FONTS.monoRegular}
                    >
                      {labelVal >= 1000
                        ? `${(labelVal / 1000).toFixed(1)}k`
                        : labelVal}
                    </SvgText>
                  </G>
                );
              })}

              {items.map((it, itemIdx) => {
                const numSeries = yKeys.length;
                const groupWidth = 265 / items.length;
                const barWidth = Math.max(
                  6,
                  Math.min(22, (groupWidth * 0.75) / numSeries)
                );
                const groupStartX =
                  38 +
                  itemIdx * groupWidth +
                  (groupWidth - barWidth * numSeries) / 2;

                return (
                  <G key={itemIdx}>
                    {yKeys.map((yk, keyIdx) => {
                      const val =
                        typeof it[yk] === "number" ? Number(it[yk]) : 0;
                      const barHeight = Math.max(
                        2,
                        (val / maxVal) * 110
                      );
                      const x = groupStartX + keyIdx * barWidth;
                      const y = 135 - barHeight;
                      const color =
                        COLORS_RECHARTS[keyIdx % COLORS_RECHARTS.length];

                      return (
                        <SvgRect
                          key={yk}
                          x={x}
                          y={y}
                          width={barWidth - 2}
                          height={barHeight}
                          rx={6}
                          ry={6}
                          fill={color}
                        />
                      );
                    })}
                  </G>
                );
              })}
            </Svg>

            <View style={styles.xAxisRow}>
              {items.map((it, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.xAxisLabel,
                    font("medium", String(it[xKey])),
                  ]}
                  numberOfLines={1}
                >
                  {String(it[xKey] ?? "")}
                </Text>
              ))}
            </View>

            {yKeys.length > 1 && (
              <View style={styles.multiSeriesLegend}>
                {yKeys.map((yk, idx) => (
                  <View key={yk} style={styles.multiSeriesLegendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        {
                          backgroundColor:
                            COLORS_RECHARTS[idx % COLORS_RECHARTS.length],
                        },
                      ]}
                    />
                    <Text style={[styles.legendLabel, font("medium", yk)]}>
                      {yk}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </Surface>
  );
}

// ============================================================================
// 6. MAIN RICH RESPONSE COMPONENT
// ============================================================================

export const RichResponse = memo(
  ({ text, isUser = false }: { text: string; isUser?: boolean }) => {
    if (!text) return null;

    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = "";
    let codeBuffer: string[] = [];
    let inMathBlock = false;
    let mathBuffer: string[] = [];
    let currentKey = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (inMathBlock) {
        const trimmedLine = line.trim();
        if (trimmedLine === "$$" || trimmedLine.endsWith("$$")) {
          inMathBlock = false;
          if (trimmedLine !== "$$") {
            mathBuffer.push(line.replace(/\$\$$/, ""));
          }
          const formula = mathBuffer.join("\n").trim();
          if (formula) {
            elements.push(
              <MathBlock
                key={`mathblock-${currentKey++}`}
                formula={formula}
              />
            );
          }
          mathBuffer = [];
        } else {
          mathBuffer.push(line);
        }
        continue;
      }

      const codeFenceMatch = line.match(/^```(\w+)?/);
      if (codeFenceMatch) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = codeFenceMatch[1] || "";
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          const codeText = codeBuffer.join("\n");

          if (
            !isUser &&
            (codeLanguage === "mermaid" ||
              codeLanguage === "flowchart" ||
              isMermaidCode(codeText, codeLanguage))
          ) {
            elements.push(
              <MermaidBlock
                key={`mermaid-${currentKey++}`}
                code={codeText}
              />
            );
            codeBuffer = [];
            continue;
          }

          if (
            !isUser &&
            (codeLanguage === "chart" ||
              codeLanguage === "graph" ||
              codeLanguage === "recharts" ||
              codeLanguage === "json")
          ) {
            try {
              const spec = JSON.parse(codeText) as ChartSpec;
              if (Array.isArray(spec.data) && spec.data.length > 0) {
                elements.push(
                  <ChartBlock
                    key={`chart-${currentKey++}`}
                    spec={spec}
                  />
                );
                codeBuffer = [];
                continue;
              }
            } catch {}
          }

          if (
            !isUser &&
            (codeLanguage === "math" ||
              codeLanguage === "latex" ||
              codeLanguage === "katex")
          ) {
            elements.push(
              <MathBlock
                key={`math-${currentKey++}`}
                formula={codeText}
              />
            );
            codeBuffer = [];
            continue;
          }

          elements.push(
            <CodeBlock
              key={`code-${currentKey++}`}
              code={codeText}
              language={codeLanguage || "text"}
            />
          );
          codeBuffer = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      const trimmed = line.trim();

      if (!isUser && trimmed.startsWith("$$")) {
        if (trimmed.endsWith("$$") && trimmed.length > 4) {
          const formula = trimmed.slice(2, -2).trim();
          elements.push(
            <MathBlock
              key={`mathblock-${currentKey++}`}
              formula={formula}
            />
          );
          continue;
        } else {
          inMathBlock = true;
          mathBuffer = [trimmed.slice(2).trim()].filter(Boolean);
          continue;
        }
      }

      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        elements.push(
          <View
            key={`hr-${currentKey++}`}
            style={[
              styles.hr,
              isUser && { backgroundColor: COLORS.border },
            ]}
          />
        );
        continue;
      }

      if (line.startsWith("# ")) {
        const headingText = line.slice(2);
        elements.push(
          <View key={`h1-${currentKey++}`} style={styles.headingBlock}>
            <InlineText
              text={headingText}
              style={[
                styles.heading1,
                font("bold", headingText),
                isUser && styles.headingUser,
              ]}
              isUser={isUser}
            />
          </View>
        );
        continue;
      }
      if (line.startsWith("## ")) {
        const headingText = line.slice(3);
        elements.push(
          <View key={`h2-${currentKey++}`} style={styles.headingBlock}>
            <InlineText
              text={headingText}
              style={[
                styles.heading2,
                font("bold", headingText),
                isUser && styles.headingUser,
              ]}
              isUser={isUser}
            />
          </View>
        );
        continue;
      }
      if (line.startsWith("### ")) {
        const headingText = line.slice(4);
        elements.push(
          <View key={`h3-${currentKey++}`} style={styles.headingBlock}>
            <InlineText
              text={headingText}
              style={[
                styles.heading3,
                font("semibold", headingText),
                isUser && styles.headingUser,
              ]}
              isUser={isUser}
            />
          </View>
        );
        continue;
      }
      if (line.startsWith("#### ")) {
        const headingText = line.slice(5);
        elements.push(
          <View key={`h4-${currentKey++}`} style={styles.headingBlock}>
            <InlineText
              text={headingText}
              style={[
                styles.heading4,
                font("semibold", headingText),
                isUser && styles.headingUser,
              ]}
              isUser={isUser}
            />
          </View>
        );
        continue;
      }

      if (line.startsWith("> ")) {
        elements.push(
          <View
            key={`quote-${currentKey++}`}
            style={[
              styles.blockquote,
              isUser && {
                borderLeftColor: COLORS.primary,
                backgroundColor: COLORS.card,
              },
            ]}
          >
            <InlineText
              text={line.slice(2)}
              style={
                isUser ? styles.blockquoteTextUser : styles.blockquoteText
              }
              isUser={isUser}
            />
          </View>
        );
        continue;
      }

      const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)/);
      if (taskMatch) {
        const isDone = taskMatch[2].toLowerCase() === "x";
        const indent = Math.floor(taskMatch[1].length / 2);
        elements.push(
          <View
            key={`task-${currentKey++}`}
            style={[styles.taskItemRow, { paddingLeft: indent * 16 }]}
          >
            {isDone ? (
              <CheckSquare
                size={15}
                color={COLORS.success}
                style={styles.taskIcon}
              />
            ) : (
              <Square
                size={15}
                color={COLORS.mutedForeground}
                style={styles.taskIcon}
              />
            )}
            <View style={styles.listItemContent}>
              <InlineText
                text={taskMatch[3]}
                style={
                  isDone &&
                  (isUser ? styles.taskDoneTextUser : styles.taskDoneText)
                }
                isUser={isUser}
              />
            </View>
          </View>
        );
        continue;
      }

      if (
        line.includes("|") &&
        i + 1 < lines.length &&
        isTableSeparator(lines[i + 1])
      ) {
        const headers = parseTableLine(line);
        const sepCells = parseTableLine(lines[i + 1]);
        const aligns: ("left" | "center" | "right")[] = sepCells.map((c) => {
          const left = c.startsWith(":");
          const right = c.endsWith(":");
          if (left && right) return "center";
          if (right) return "right";
          return "left";
        });

        const rows: string[][] = [];
        i += 1;

        while (
          i + 1 < lines.length &&
          lines[i + 1].trim().startsWith("|")
        ) {
          i++;
          rows.push(parseTableLine(lines[i]));
        }

        elements.push(
          <MarkdownTable
            key={`table-${currentKey++}`}
            table={{ headers, aligns, rows }}
            isUser={isUser}
          />
        );
        continue;
      }

      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)/);
      if (bulletMatch) {
        const indent = Math.floor(bulletMatch[1].length / 2);
        elements.push(
          <View
            key={`bullet-${currentKey++}`}
            style={[styles.listItemRow, { paddingLeft: indent * 16 }]}
          >
            <Text style={styles.bulletDot}>•</Text>
            <View style={styles.listItemContent}>
              <InlineText text={bulletMatch[2]} isUser={isUser} />
            </View>
          </View>
        );
        continue;
      }

      const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/);
      if (numberMatch) {
        const indent = Math.floor(numberMatch[1].length / 2);
        elements.push(
          <View
            key={`num-${currentKey++}`}
            style={[styles.listItemRow, { paddingLeft: indent * 16 }]}
          >
            <Text style={[styles.numberIndex, mono("bold")]}>
              {numberMatch[2]}.
            </Text>
            <View style={styles.listItemContent}>
              <InlineText text={numberMatch[3]} isUser={isUser} />
            </View>
          </View>
        );
        continue;
      }

      if (!trimmed) {
        if (elements.length > 0 && i < lines.length - 1 && lines[i + 1]?.trim()) {
          elements.push(
            <View key={`spacer-${currentKey++}`} style={styles.spacer} />
          );
        }
        continue;
      }

      elements.push(
        <View key={`p-${currentKey++}`} style={styles.paragraphContainer}>
          <InlineText text={line} isUser={isUser} />
        </View>
      );
    }

    if (inMathBlock && mathBuffer.length > 0) {
      elements.push(
        <MathBlock
          key={`math-stream-${currentKey++}`}
          formula={mathBuffer.join("\n").trim()}
        />
      );
    }

    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <CodeBlock
          key={`code-stream-${currentKey++}`}
          code={codeBuffer.join("\n")}
          language={codeLanguage || "text"}
        />
      );
    }

    return <View style={styles.container}>{elements}</View>;
  }
);

RichResponse.displayName = "RichResponse";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: 3,
  },
  paragraphContainer: {
    marginVertical: 1.5,
  },
  inlineBaseText: {
    fontSize: 15.5,
    lineHeight: 24,
    color: COLORS.foreground,
  },
  inlineBaseTextUser: {
    fontSize: 15.5,
    lineHeight: 24,
    color: COLORS.foreground,
  },
  boldText: {
    fontWeight: "700",
    color: COLORS.foreground,
  },
  boldTextUser: {
    fontWeight: "700",
    color: COLORS.foreground,
  },
  italicText: {
    fontStyle: "italic",
    color: COLORS.foreground,
  },
  italicTextUser: {
    fontStyle: "italic",
    color: COLORS.foreground,
  },
  boldItalicText: {
    fontWeight: "700",
    fontStyle: "italic",
    color: COLORS.foreground,
  },
  strikeText: {
    textDecorationLine: "line-through",
    color: COLORS.mutedForeground,
  },
  strikeTextUser: {
    textDecorationLine: "line-through",
    color: COLORS.mutedForeground,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  linkTextUser: {
    color: COLORS.primary,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  inlineCodeText: {
    fontSize: 13.5,
    backgroundColor: COLORS.secondary,
    color: COLORS.foreground,
    borderRadius: 4,
    overflow: "hidden",
  },
  inlineCodeTextUser: {
    fontSize: 13.5,
    backgroundColor: COLORS.card,
    color: COLORS.foreground,
    borderRadius: 4,
    overflow: "hidden",
  },
  inlineMathText: {
    fontSize: 13,
    color: COLORS.foreground,
    paddingHorizontal: 2,
  },
  inlineMathTextUser: {
    fontSize: 13,
    color: COLORS.foreground,
    paddingHorizontal: 2,
  },
  headingBlock: {
    marginVertical: 2,
  },
  heading1: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heading2: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 8,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  heading3: {
    fontSize: 14.5,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: 6,
    marginBottom: 2,
  },
  heading4: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: 5,
    marginBottom: 2,
  },
  headingUser: {
    color: COLORS.foreground,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.border,
    paddingLeft: 10,
    paddingVertical: 4,
    marginVertical: 3,
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  blockquoteText: {
    fontStyle: "italic",
    color: COLORS.mutedForeground,
  },
  blockquoteTextUser: {
    fontStyle: "italic",
    color: COLORS.mutedForeground,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginVertical: 1,
  },
  bulletDot: {
    fontSize: 15.5,
    lineHeight: 24,
    color: COLORS.mutedForeground,
    fontWeight: "700",
  },
  numberIndex: {
    fontSize: 13,
    lineHeight: 22,
    color: COLORS.mutedForeground,
    fontWeight: "600",
    minWidth: 16,
  },
  listItemContent: {
    flex: 1,
  },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginVertical: 2,
  },
  taskIcon: {
    marginTop: 3,
  },
  taskDoneText: {
    color: COLORS.mutedForeground,
    textDecorationLine: "line-through",
  },
  taskDoneTextUser: {
    color: COLORS.mutedForeground,
    textDecorationLine: "line-through",
  },
  hr: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  spacer: {
    height: 3,
  },

  // Table styles
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginVertical: 6,
    overflow: "hidden",
  },
  tableCardUser: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  tableGrid: {
    minWidth: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderRowUser: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 85,
    justifyContent: "center",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  tableHeaderTextUser: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.secondary,
  },
  tableRowAltUser: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 85,
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.foreground,
  },
  tableCellTextUser: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.foreground,
  },
  cellCenter: {
    alignItems: "center",
  },
  cellRight: {
    alignItems: "flex-end",
  },

  // Mermaid Diagram Styles
  mermaidCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginVertical: 6,
    overflow: "hidden",
  },
  mermaidHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mermaidLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  mermaidIconTag: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  mermaidHeaderText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    textTransform: "lowercase",
  },
  mermaidActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mermaidActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mermaidActionBtnText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  mermaidCodeFallback: {
    padding: 6,
  },
  mermaidErrorBanner: {
    padding: 8,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 8,
    marginBottom: 6,
  },
  mermaidErrorText: {
    fontSize: 11,
    color: COLORS.destructive,
  },
  mermaidWebViewContainer: {
    width: "100%",
    backgroundColor: "transparent",
    position: "relative",
  },
  mermaidWebView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  mermaidFloatingControls: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    gap: 2,
    zIndex: 10,
  },
  floatingZoomBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  floatingZoomResetBtn: {
    paddingHorizontal: 6,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingZoomText: {
    fontSize: 10.5,
    color: COLORS.foreground,
    minWidth: 32,
    textAlign: "center",
  },
  mermaidLoaderBox: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    zIndex: 2,
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === "ios" ? 44 : 12,
  },
  fullscreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fullscreenTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  fullscreenZoomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fullscreenZoomBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullscreenCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
    marginLeft: 4,
  },
  fullscreenWebViewBox: {
    flex: 1,
  },
  fullscreenWebView: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // Math styles
  mathCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginVertical: 5,
    overflow: "hidden",
    padding: 4,
  },
  mathHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 1,
  },
  mathBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  mathBadgeText: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    fontWeight: "700",
  },
  mathCopyBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  mathWebViewBox: {
    width: "100%",
  },
  mathWebView: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // Chart styles (figure className="glass my-3 rounded-2xl p-3")
  chartCard: {
    borderRadius: 16,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
    marginBottom: 8,
  },
  chartBody: {
    width: "100%",
  },
  circularPieContainer: {
    alignItems: "center",
    gap: 10,
  },
  pieSvgWrapper: {
    width: 180,
    height: 180,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenterOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
  },
  pieCenterValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  pieCenterLabel: {
    fontSize: 10,
    color: COLORS.mutedForeground,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: "48%",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRadius: 5,
  },
  legendItemSelected: {
    backgroundColor: COLORS.secondary,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    flex: 1,
  },
  legendValue: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  svgChartContainer: {
    alignItems: "center",
    paddingTop: 2,
  },
  xAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingLeft: 34,
    paddingRight: 8,
    marginTop: 4,
  },
  xAxisLabel: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    maxWidth: 55,
    textAlign: "center",
  },
  multiSeriesLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 10,
  },
  multiSeriesLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
});
