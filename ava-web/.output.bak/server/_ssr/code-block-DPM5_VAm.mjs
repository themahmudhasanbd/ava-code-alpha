import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as cn } from "./ava-provider-C7vD2Dgg.mjs";
import { n as createHighlighter } from "../_libs/shiki.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/code-block-DPM5_VAm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var isItalic = (fontStyle) => fontStyle && fontStyle & 1;
var isBold = (fontStyle) => fontStyle && fontStyle & 2;
var isUnderline = (fontStyle) => fontStyle && fontStyle & 4;
var addKeysToTokens = (lines) => lines.map((line, lineIdx) => ({
	key: `line-${lineIdx}`,
	tokens: line.map((token, tokenIdx) => ({
		key: `line-${lineIdx}-${tokenIdx}`,
		token
	}))
}));
var TokenSpan = ({ token }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
	className: "dark:!bg-[var(--shiki-dark-bg)] dark:!text-[var(--shiki-dark)]",
	style: {
		backgroundColor: token.bgColor,
		color: token.color,
		fontStyle: isItalic(token.fontStyle) ? "italic" : void 0,
		fontWeight: isBold(token.fontStyle) ? "bold" : void 0,
		textDecoration: isUnderline(token.fontStyle) ? "underline" : void 0,
		...token.htmlStyle
	},
	children: token.content
});
var LINE_NUMBER_CLASSES = cn("block", "before:content-[counter(line)]", "before:inline-block", "before:[counter-increment:line]", "before:w-8", "before:mr-4", "before:text-right", "before:text-muted-foreground/50", "before:font-mono", "before:select-none");
var LineSpan = ({ keyedLine, showLineNumbers }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
	className: showLineNumbers ? LINE_NUMBER_CLASSES : "block",
	children: keyedLine.tokens.length === 0 ? "\n" : keyedLine.tokens.map(({ token, key }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TokenSpan, { token }, key))
});
var CodeBlockContext = (0, import_react.createContext)({ code: "" });
var highlighterCache = /* @__PURE__ */ new Map();
var tokensCache = /* @__PURE__ */ new Map();
var subscribers = /* @__PURE__ */ new Map();
var getTokensCacheKey = (code, language) => {
	const start = code.slice(0, 100);
	const end = code.length > 100 ? code.slice(-100) : "";
	return `${language}:${code.length}:${start}:${end}`;
};
var getHighlighter = (language) => {
	const cached = highlighterCache.get(language);
	if (cached) return cached;
	const highlighterPromise = createHighlighter({
		langs: [language],
		themes: ["github-light", "github-dark"]
	});
	highlighterCache.set(language, highlighterPromise);
	return highlighterPromise;
};
var createRawTokens = (code) => ({
	bg: "transparent",
	fg: "inherit",
	tokens: code.split("\n").map((line) => line === "" ? [] : [{
		color: "inherit",
		content: line
	}])
});
var highlightCode = (code, language, callback) => {
	const tokensCacheKey = getTokensCacheKey(code, language);
	const cached = tokensCache.get(tokensCacheKey);
	if (cached) return cached;
	if (callback) {
		if (!subscribers.has(tokensCacheKey)) subscribers.set(tokensCacheKey, /* @__PURE__ */ new Set());
		subscribers.get(tokensCacheKey)?.add(callback);
	}
	getHighlighter(language).then((highlighter) => {
		const langToUse = highlighter.getLoadedLanguages().includes(language) ? language : "text";
		const result = highlighter.codeToTokens(code, {
			lang: langToUse,
			themes: {
				dark: "github-dark",
				light: "github-light"
			}
		});
		const tokenized = {
			bg: result.bg ?? "transparent",
			fg: result.fg ?? "inherit",
			tokens: result.tokens
		};
		tokensCache.set(tokensCacheKey, tokenized);
		const subs = subscribers.get(tokensCacheKey);
		if (subs) {
			for (const sub of subs) sub(tokenized);
			subscribers.delete(tokensCacheKey);
		}
	}).catch((error) => {
		console.error("Failed to highlight code:", error);
		subscribers.delete(tokensCacheKey);
	});
	return null;
};
var CodeBlockBody = (0, import_react.memo)(({ tokenized, showLineNumbers, className }) => {
	const preStyle = (0, import_react.useMemo)(() => ({
		backgroundColor: tokenized.bg,
		color: tokenized.fg
	}), [tokenized.bg, tokenized.fg]);
	const keyedLines = (0, import_react.useMemo)(() => addKeysToTokens(tokenized.tokens), [tokenized.tokens]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
		className: cn("dark:!bg-[var(--shiki-dark-bg)] dark:!text-[var(--shiki-dark)] m-0 p-4 text-sm", className),
		style: preStyle,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
			className: cn("font-mono text-sm", showLineNumbers && "[counter-increment:line_0] [counter-reset:line]"),
			children: keyedLines.map((keyedLine) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LineSpan, {
				keyedLine,
				showLineNumbers
			}, keyedLine.key))
		})
	});
}, (prevProps, nextProps) => prevProps.tokenized === nextProps.tokenized && prevProps.showLineNumbers === nextProps.showLineNumbers && prevProps.className === nextProps.className);
CodeBlockBody.displayName = "CodeBlockBody";
var CodeBlockContainer = ({ className, language, style, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("group relative w-full overflow-hidden rounded-md border bg-background text-foreground", className),
	"data-language": language,
	style: {
		containIntrinsicSize: "auto 200px",
		contentVisibility: "auto",
		...style
	},
	...props
});
var CodeBlockContent = ({ code, language, showLineNumbers = false }) => {
	const rawTokens = (0, import_react.useMemo)(() => createRawTokens(code), [code]);
	const syncTokens = (0, import_react.useMemo)(() => highlightCode(code, language) ?? rawTokens, [
		code,
		language,
		rawTokens
	]);
	const [asyncTokens, setAsyncTokens] = (0, import_react.useState)(null);
	const asyncKeyRef = (0, import_react.useRef)({
		code,
		language
	});
	if (asyncKeyRef.current.code !== code || asyncKeyRef.current.language !== language) {
		asyncKeyRef.current = {
			code,
			language
		};
		setAsyncTokens(null);
	}
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		highlightCode(code, language, (result) => {
			if (!cancelled) setAsyncTokens(result);
		});
		return () => {
			cancelled = true;
		};
	}, [code, language]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative overflow-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlockBody, {
			showLineNumbers,
			tokenized: asyncTokens ?? syncTokens
		})
	});
};
var CodeBlock = ({ code, language, showLineNumbers = false, className, children, ...props }) => {
	const contextValue = (0, import_react.useMemo)(() => ({ code }), [code]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlockContext.Provider, {
		value: contextValue,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CodeBlockContainer, {
			className,
			language,
			...props,
			children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBlockContent, {
				code,
				language,
				showLineNumbers
			})]
		})
	});
};
//#endregion
export { CodeBlockContent as n, CodeBlock as t };
