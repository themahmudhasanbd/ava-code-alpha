import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { COLORS } from "@/theme/colors";

const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

export const RichResponse = memo(({ text }: { text: string }) => {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (start > lastIndex) {
      const textBefore = text.slice(lastIndex, start);
      parts.push(
        <Text key={`text-${lastIndex}`} style={styles.paragraph}>
          {textBefore}
        </Text>
      );
    }

    const language = match[1] || "text";
    const code = match[2] || "";
    parts.push(
      <CodeBlock
        key={`code-${start}`}
        code={code.trim()}
        language={language}
      />
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`text-${lastIndex}`} style={styles.paragraph}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return <View style={styles.container}>{parts}</View>;
});

RichResponse.displayName = "RichResponse";

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.foreground,
  },
});
