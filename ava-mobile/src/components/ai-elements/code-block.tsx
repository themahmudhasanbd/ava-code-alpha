import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Check, Copy } from "lucide-react-native";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

// Token categories for lightweight, high-fidelity syntax highlighting
const SYNTAX_COLORS = {
  keyword: "#c678dd", // purple (import, export, const, let, function, return, class, def, fn, pub, if, else)
  string: "#98c379", // green ("hello", 'world')
  number: "#d19a66", // orange (123, 0.5)
  comment: "#5c6370", // grey (// comment, # comment)
  type: "#e5c07b", // yellow (string, number, boolean, Promise, ReactNode, i32)
  punctuation: "#abb2bf", // brackets, colons
  jsonKey: "#61afef", // cyan for json keys
  property: "#e06c75", // red/pink for properties
  defaultText: "#abb2bf",
};

interface Token {
  type: keyof typeof SYNTAX_COLORS | "defaultText";
  text: string;
}

function tokenizeLine(line: string, language?: string): Token[] {
  const lang = (language || "").toLowerCase();
  const tokens: Token[] = [];

  // Special case: Diff lines
  if (lang === "diff" || lang === "patch") {
    return [{ type: "defaultText", text: line }];
  }

  // JSON key-value highlighting
  if (lang === "json") {
    const jsonMatch = line.match(/^(\s*)("(?:\\\\.|[^\\\\"])*")(\s*:?\s*)(.*)$/);
    if (jsonMatch) {
      if (jsonMatch[1]) tokens.push({ type: "defaultText", text: jsonMatch[1] });
      tokens.push({ type: "jsonKey", text: jsonMatch[2] });
      tokens.push({ type: "punctuation", text: jsonMatch[3] });
      const rest = jsonMatch[4];
      if (rest.startsWith('"')) {
        tokens.push({ type: "string", text: rest });
      } else if (/^-?\d+(\.\d+)?/.test(rest)) {
        tokens.push({ type: "number", text: rest });
      } else if (rest.startsWith("true") || rest.startsWith("false") || rest.startsWith("null")) {
        tokens.push({ type: "keyword", text: rest });
      } else {
        tokens.push({ type: "defaultText", text: rest });
      }
      return tokens;
    }
  }

  // Comments
  if (line.trim().startsWith("//") || line.trim().startsWith("#") || line.trim().startsWith("--")) {
    return [{ type: "comment", text: line }];
  }

  // General tokenizer
  const regex = /(\/\/[^\n]*|"(?:\\\\.|[^\\\\"])*"|'(?:\\\\.|[^'\\\\])*'|`(?:\\\\.|[^\\\\`])*`|\b(?:import|export|from|const|let|var|function|return|if|else|for|while|switch|case|break|default|class|extends|async|await|try|catch|finally|throw|new|typeof|instanceof|interface|type|enum|public|private|protected|static|readonly|fn|pub|mut|impl|struct|trait|def|elif|lambda|yield|select|from|where|insert|update|delete|create|table|drop|alter)\b|\b(?:string|number|boolean|any|void|never|unknown|object|Symbol|null|undefined|true|false|Promise|React|ReactNode|View|Text|StyleSheet|Array|Record|Map|Set|i8|i16|i32|i64|u8|u16|u32|u64|f32|f64|str|String|Vec|Option|Result|int|float|bool|list|dict|tuple)\b|-?\b\d+(?:\.\d+)?\b|[{}()\[\],;:])/g;

  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(line)) !== null) {
    if (m.index > lastIdx) {
      tokens.push({
        type: "defaultText",
        text: line.slice(lastIdx, m.index),
      });
    }

    const val = m[0];
    if (val.startsWith("//")) {
      tokens.push({ type: "comment", text: val });
    } else if (val.startsWith('"') || val.startsWith("'") || val.startsWith("`")) {
      tokens.push({ type: "string", text: val });
    } else if (/^-?\d/.test(val)) {
      tokens.push({ type: "number", text: val });
    } else if (/^[{}()\[\],;:]$/.test(val)) {
      tokens.push({ type: "punctuation", text: val });
    } else if (
      /^(?:import|export|from|const|let|var|function|return|if|else|for|while|switch|case|break|default|class|extends|async|await|try|catch|finally|throw|new|typeof|instanceof|interface|type|enum|public|private|protected|static|readonly|fn|pub|mut|impl|struct|trait|def|elif|lambda|yield|select|where|insert|update|delete|create|table|drop|alter)$/.test(
        val
      )
    ) {
      tokens.push({ type: "keyword", text: val });
    } else {
      tokens.push({ type: "type", text: val });
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < line.length) {
    tokens.push({ type: "defaultText", text: line.slice(lastIdx) });
  }

  return tokens.length > 0 ? tokens : [{ type: "defaultText", text: line }];
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (code) {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isDiff = language === "diff" || language === "patch";
  const lines = useMemo(() => code.split("\n"), [code]);

  return (
    <View style={styles.container}>
      {/* Code Header Bar */}
      <View style={styles.header}>
        <View style={styles.langBadge}>
          <Text style={[styles.languageText, mono("bold")]}>
            {language || "code"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleCopy}
          style={styles.copyBtn}
          activeOpacity={0.7}
        >
          {copied ? (
            <Check size={13} color={COLORS.success} />
          ) : (
            <Copy size={13} color={COLORS.mutedForeground} />
          )}
          <Text
            style={[
              styles.copyText,
              font("medium"),
              copied && styles.copyTextSuccess,
            ]}
          >
            {copied ? "Copied" : "Copy"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Code Lines Body */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.codeContainer}>
          {lines.map((line, idx) => {
            const isAdd = isDiff && line.startsWith("+");
            const isDel = isDiff && line.startsWith("-");
            const isChunk = isDiff && line.startsWith("@@");
            const lineTokens = tokenizeLine(line, language);

            return (
              <View
                key={idx}
                style={[
                  styles.lineRow,
                  isAdd && styles.lineAdd,
                  isDel && styles.lineDel,
                  isChunk && styles.lineChunk,
                ]}
              >
                {/* Line Number Column */}
                {showLineNumbers && (
                  <View style={styles.gutter}>
                    <Text
                      style={[
                        styles.lineNumber,
                        mono("regular"),
                        isAdd && styles.gutterAdd,
                        isDel && styles.gutterDel,
                        isChunk && styles.gutterChunk,
                      ]}
                    >
                      {isAdd ? "+" : isDel ? "-" : isChunk ? "@" : idx + 1}
                    </Text>
                  </View>
                )}

                {/* Line Text Tokens */}
                <View style={styles.tokensRow}>
                  {lineTokens.map((tok, tIdx) => (
                    <Text
                      key={tIdx}
                      style={[
                        styles.codeText,
                        mono("regular"),
                        { color: SYNTAX_COLORS[tok.type] },
                        isAdd && styles.textAdd,
                        isDel && styles.textDel,
                        isChunk && styles.textChunk,
                      ]}
                    >
                      {tok.text}
                    </Text>
                  ))}
                  {line.length === 0 && (
                    <Text style={[styles.codeText, mono("regular")]}> </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0d1117",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginVertical: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  langBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  languageText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.mutedForeground,
    textTransform: "lowercase",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  copyText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  copyTextSuccess: {
    color: COLORS.success,
  },
  scrollContent: {
    paddingVertical: 10,
    minWidth: "100%",
  },
  codeContainer: {
    flexDirection: "column",
    minWidth: "100%",
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 1.5,
    minWidth: "100%",
  },
  gutter: {
    width: 34,
    marginRight: 12,
    alignItems: "flex-end",
  },
  lineNumber: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.25)",
    textAlign: "right",
  },
  gutterAdd: {
    color: "#4ade80",
    fontWeight: "700",
  },
  gutterDel: {
    color: "#f87171",
    fontWeight: "700",
  },
  gutterChunk: {
    color: "#818cf8",
    fontWeight: "700",
  },
  tokensRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  lineAdd: {
    backgroundColor: "rgba(34, 197, 94, 0.16)",
  },
  lineDel: {
    backgroundColor: "rgba(239, 68, 68, 0.16)",
  },
  lineChunk: {
    backgroundColor: "rgba(99, 102, 241, 0.14)",
  },
  codeText: {
    fontSize: 12.5,
    lineHeight: 20,
    color: "#c9d1d9",
  },
  textAdd: {
    color: "#4ade80",
  },
  textDel: {
    color: "#f87171",
  },
  textChunk: {
    color: "#818cf8",
  },
});
