import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { l as require_react_dom, u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { F as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
import { n as clsx } from "./class-variance-authority+clsx.mjs";
import { i as visitParents, n as visit, r as SKIP } from "./@streamdown/cjk+[...].mjs";
import { a as VFile } from "./@streamdown/math+[...].mjs";
import { t as harden } from "./rehype-harden.mjs";
import { t as rehypeRaw } from "./rehype-raw.mjs";
import { n as defaultSchema } from "./hast-util-sanitize.mjs";
import { t as rehypeSanitize } from "./rehype-sanitize.mjs";
import { t as remarkGfm } from "./remark-gfm.mjs";
import { t as We$1 } from "./remend.mjs";
import { t as toJsxRuntime } from "./hast-util-to-jsx-runtime+[...].mjs";
import { t as urlAttributes } from "./html-url-attributes.mjs";
import { t as remarkParse } from "./remark-parse.mjs";
import { t as remarkRehype } from "./remark-rehype.mjs";
import { t as bail } from "./bail.mjs";
import { t as require_extend } from "./extend.mjs";
import { t as isPlainObject } from "./is-plain-obj.mjs";
import { t as x$1 } from "./marked.mjs";
//#region node_modules/tailwind-merge/dist/bundle-mjs.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* Concatenates two arrays faster than the array spread operator.
*/
var concatArrays = (array1, array2) => {
	const combinedArray = new Array(array1.length + array2.length);
	for (let i = 0; i < array1.length; i++) combinedArray[i] = array1[i];
	for (let i = 0; i < array2.length; i++) combinedArray[array1.length + i] = array2[i];
	return combinedArray;
};
var createClassValidatorObject = (classGroupId, validator) => ({
	classGroupId,
	validator
});
var createClassPartObject = (nextPart = /* @__PURE__ */ new Map(), validators = null, classGroupId) => ({
	nextPart,
	validators,
	classGroupId
});
var CLASS_PART_SEPARATOR = "-";
var EMPTY_CONFLICTS = [];
var ARBITRARY_PROPERTY_PREFIX = "arbitrary..";
var createClassGroupUtils = (config) => {
	const classMap = createClassMap(config);
	const { conflictingClassGroups, conflictingClassGroupModifiers } = config;
	const getClassGroupId = (className) => {
		if (className.startsWith("[") && className.endsWith("]")) return getGroupIdForArbitraryProperty(className);
		const classParts = className.split(CLASS_PART_SEPARATOR);
		return getGroupRecursive(classParts, classParts[0] === "" && classParts.length > 1 ? 1 : 0, classMap);
	};
	const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
		if (hasPostfixModifier) {
			const modifierConflicts = conflictingClassGroupModifiers[classGroupId];
			const baseConflicts = conflictingClassGroups[classGroupId];
			if (modifierConflicts) {
				if (baseConflicts) return concatArrays(baseConflicts, modifierConflicts);
				return modifierConflicts;
			}
			return baseConflicts || EMPTY_CONFLICTS;
		}
		return conflictingClassGroups[classGroupId] || EMPTY_CONFLICTS;
	};
	return {
		getClassGroupId,
		getConflictingClassGroupIds
	};
};
var getGroupRecursive = (classParts, startIndex, classPartObject) => {
	if (classParts.length - startIndex === 0) return classPartObject.classGroupId;
	const currentClassPart = classParts[startIndex];
	const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
	if (nextClassPartObject) {
		const result = getGroupRecursive(classParts, startIndex + 1, nextClassPartObject);
		if (result) return result;
	}
	const validators = classPartObject.validators;
	if (validators === null) return;
	const classRest = startIndex === 0 ? classParts.join(CLASS_PART_SEPARATOR) : classParts.slice(startIndex).join(CLASS_PART_SEPARATOR);
	const validatorsLength = validators.length;
	for (let i = 0; i < validatorsLength; i++) {
		const validatorObj = validators[i];
		if (validatorObj.validator(classRest)) return validatorObj.classGroupId;
	}
};
/**
* Get the class group ID for an arbitrary property.
*
* @param className - The class name to get the group ID for. Is expected to be string starting with `[` and ending with `]`.
*/
var getGroupIdForArbitraryProperty = (className) => className.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
	const content = className.slice(1, -1);
	const colonIndex = content.indexOf(":");
	const property = content.slice(0, colonIndex);
	return property ? ARBITRARY_PROPERTY_PREFIX + property : void 0;
})();
/**
* Exported for testing only
*/
var createClassMap = (config) => {
	const { theme, classGroups } = config;
	return processClassGroups(classGroups, theme);
};
var processClassGroups = (classGroups, theme) => {
	const classMap = createClassPartObject();
	for (const classGroupId in classGroups) {
		const group = classGroups[classGroupId];
		processClassesRecursively(group, classMap, classGroupId, theme);
	}
	return classMap;
};
var processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
	const len = classGroup.length;
	for (let i = 0; i < len; i++) {
		const classDefinition = classGroup[i];
		processClassDefinition(classDefinition, classPartObject, classGroupId, theme);
	}
};
var processClassDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
	if (typeof classDefinition === "string") {
		processStringDefinition(classDefinition, classPartObject, classGroupId);
		return;
	}
	if (typeof classDefinition === "function") {
		processFunctionDefinition(classDefinition, classPartObject, classGroupId, theme);
		return;
	}
	processObjectDefinition(classDefinition, classPartObject, classGroupId, theme);
};
var processStringDefinition = (classDefinition, classPartObject, classGroupId) => {
	const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
	classPartObjectToEdit.classGroupId = classGroupId;
};
var processFunctionDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
	if (isThemeGetter(classDefinition)) {
		processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
		return;
	}
	if (classPartObject.validators === null) classPartObject.validators = [];
	classPartObject.validators.push(createClassValidatorObject(classGroupId, classDefinition));
};
var processObjectDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
	const entries = Object.entries(classDefinition);
	const len = entries.length;
	for (let i = 0; i < len; i++) {
		const [key, value] = entries[i];
		processClassesRecursively(value, getPart(classPartObject, key), classGroupId, theme);
	}
};
var getPart = (classPartObject, path) => {
	let current = classPartObject;
	const parts = path.split(CLASS_PART_SEPARATOR);
	const len = parts.length;
	for (let i = 0; i < len; i++) {
		const part = parts[i];
		let next = current.nextPart.get(part);
		if (!next) {
			next = createClassPartObject();
			current.nextPart.set(part, next);
		}
		current = next;
	}
	return current;
};
var isThemeGetter = (func) => "isThemeGetter" in func && func.isThemeGetter === true;
var createLruCache = (maxCacheSize) => {
	if (maxCacheSize < 1) return {
		get: () => void 0,
		set: () => {}
	};
	let cacheSize = 0;
	let cache = Object.create(null);
	let previousCache = Object.create(null);
	const update = (key, value) => {
		cache[key] = value;
		cacheSize++;
		if (cacheSize > maxCacheSize) {
			cacheSize = 0;
			previousCache = cache;
			cache = Object.create(null);
		}
	};
	return {
		get(key) {
			let value = cache[key];
			if (value !== void 0) return value;
			if ((value = previousCache[key]) !== void 0) {
				update(key, value);
				return value;
			}
		},
		set(key, value) {
			if (key in cache) cache[key] = value;
			else update(key, value);
		}
	};
};
var IMPORTANT_MODIFIER = "!";
var MODIFIER_SEPARATOR = ":";
var EMPTY_MODIFIERS = [];
var createResultObject = (modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition, isExternal) => ({
	modifiers,
	hasImportantModifier,
	baseClassName,
	maybePostfixModifierPosition,
	isExternal
});
var createParseClassName = (config) => {
	const { prefix, experimentalParseClassName } = config;
	/**
	* Parse class name into parts.
	*
	* Inspired by `splitAtTopLevelOnly` used in Tailwind CSS
	* @see https://github.com/tailwindlabs/tailwindcss/blob/v3.2.2/src/util/splitAtTopLevelOnly.js
	*/
	let parseClassName = (className) => {
		const modifiers = [];
		let bracketDepth = 0;
		let parenDepth = 0;
		let modifierStart = 0;
		let postfixModifierPosition;
		const len = className.length;
		for (let index = 0; index < len; index++) {
			const currentCharacter = className[index];
			if (bracketDepth === 0 && parenDepth === 0) {
				if (currentCharacter === MODIFIER_SEPARATOR) {
					modifiers.push(className.slice(modifierStart, index));
					modifierStart = index + 1;
					continue;
				}
				if (currentCharacter === "/") {
					postfixModifierPosition = index;
					continue;
				}
			}
			if (currentCharacter === "[") bracketDepth++;
			else if (currentCharacter === "]") bracketDepth--;
			else if (currentCharacter === "(") parenDepth++;
			else if (currentCharacter === ")") parenDepth--;
		}
		const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.slice(modifierStart);
		let baseClassName = baseClassNameWithImportantModifier;
		let hasImportantModifier = false;
		if (baseClassNameWithImportantModifier.endsWith(IMPORTANT_MODIFIER)) {
			baseClassName = baseClassNameWithImportantModifier.slice(0, -1);
			hasImportantModifier = true;
		} else if (baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)) {
			baseClassName = baseClassNameWithImportantModifier.slice(1);
			hasImportantModifier = true;
		}
		const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : void 0;
		return createResultObject(modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition);
	};
	if (prefix) {
		const fullPrefix = prefix + MODIFIER_SEPARATOR;
		const parseClassNameOriginal = parseClassName;
		parseClassName = (className) => className.startsWith(fullPrefix) ? parseClassNameOriginal(className.slice(fullPrefix.length)) : createResultObject(EMPTY_MODIFIERS, false, className, void 0, true);
	}
	if (experimentalParseClassName) {
		const parseClassNameOriginal = parseClassName;
		parseClassName = (className) => experimentalParseClassName({
			className,
			parseClassName: parseClassNameOriginal
		});
	}
	return parseClassName;
};
/**
* Sorts modifiers according to following schema:
* - Predefined modifiers are sorted alphabetically
* - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
*/
var createSortModifiers = (config) => {
	const modifierWeights = /* @__PURE__ */ new Map();
	config.orderSensitiveModifiers.forEach((mod, index) => {
		modifierWeights.set(mod, 1e6 + index);
	});
	return (modifiers) => {
		const result = [];
		let currentSegment = [];
		for (let i = 0; i < modifiers.length; i++) {
			const modifier = modifiers[i];
			const isArbitrary = modifier[0] === "[";
			const isOrderSensitive = modifierWeights.has(modifier);
			if (isArbitrary || isOrderSensitive) {
				if (currentSegment.length > 0) {
					currentSegment.sort();
					result.push(...currentSegment);
					currentSegment = [];
				}
				result.push(modifier);
			} else currentSegment.push(modifier);
		}
		if (currentSegment.length > 0) {
			currentSegment.sort();
			result.push(...currentSegment);
		}
		return result;
	};
};
var createConfigUtils = (config) => ({
	cache: createLruCache(config.cacheSize),
	parseClassName: createParseClassName(config),
	sortModifiers: createSortModifiers(config),
	postfixLookupClassGroupIds: createPostfixLookupClassGroupIds(config),
	...createClassGroupUtils(config)
});
var createPostfixLookupClassGroupIds = (config) => {
	const lookup = Object.create(null);
	const classGroupIds = config.postfixLookupClassGroups;
	if (classGroupIds) for (let i = 0; i < classGroupIds.length; i++) lookup[classGroupIds[i]] = true;
	return lookup;
};
var SPLIT_CLASSES_REGEX = /\s+/;
var mergeClassList = (classList, configUtils) => {
	const { parseClassName, getClassGroupId, getConflictingClassGroupIds, sortModifiers, postfixLookupClassGroupIds } = configUtils;
	/**
	* Set of classGroupIds in following format:
	* `{importantModifier}{variantModifiers}{classGroupId}`
	* @example 'float'
	* @example 'hover:focus:bg-color'
	* @example 'md:!pr'
	*/
	const classGroupsInConflict = [];
	const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
	let result = "";
	for (let index = classNames.length - 1; index >= 0; index -= 1) {
		const originalClassName = classNames[index];
		const { isExternal, modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition } = parseClassName(originalClassName);
		if (isExternal) {
			result = originalClassName + (result.length > 0 ? " " + result : result);
			continue;
		}
		let hasPostfixModifier = !!maybePostfixModifierPosition;
		let classGroupId;
		if (hasPostfixModifier) {
			classGroupId = getClassGroupId(baseClassName.substring(0, maybePostfixModifierPosition));
			const classGroupIdWithPostfix = classGroupId && postfixLookupClassGroupIds[classGroupId] ? getClassGroupId(baseClassName) : void 0;
			if (classGroupIdWithPostfix && classGroupIdWithPostfix !== classGroupId) {
				classGroupId = classGroupIdWithPostfix;
				hasPostfixModifier = false;
			}
		} else classGroupId = getClassGroupId(baseClassName);
		if (!classGroupId) {
			if (!hasPostfixModifier) {
				result = originalClassName + (result.length > 0 ? " " + result : result);
				continue;
			}
			classGroupId = getClassGroupId(baseClassName);
			if (!classGroupId) {
				result = originalClassName + (result.length > 0 ? " " + result : result);
				continue;
			}
			hasPostfixModifier = false;
		}
		const variantModifier = modifiers.length === 0 ? "" : modifiers.length === 1 ? modifiers[0] : sortModifiers(modifiers).join(":");
		const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
		const classId = modifierId + classGroupId;
		if (classGroupsInConflict.indexOf(classId) > -1) continue;
		classGroupsInConflict.push(classId);
		const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
		for (let i = 0; i < conflictGroups.length; ++i) {
			const group = conflictGroups[i];
			classGroupsInConflict.push(modifierId + group);
		}
		result = originalClassName + (result.length > 0 ? " " + result : result);
	}
	return result;
};
/**
* The code in this file is copied from https://github.com/lukeed/clsx and modified to suit the needs of tailwind-merge better.
*
* Specifically:
* - Runtime code from https://github.com/lukeed/clsx/blob/v1.2.1/src/index.js
* - TypeScript types from https://github.com/lukeed/clsx/blob/v1.2.1/clsx.d.ts
*
* Original code has MIT license: Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)
*/
var twJoin = (...classLists) => {
	let index = 0;
	let argument;
	let resolvedValue;
	let string = "";
	while (index < classLists.length) if (argument = classLists[index++]) {
		if (resolvedValue = toValue(argument)) {
			string && (string += " ");
			string += resolvedValue;
		}
	}
	return string;
};
var toValue = (mix) => {
	if (typeof mix === "string") return mix;
	let resolvedValue;
	let string = "";
	for (let k = 0; k < mix.length; k++) if (mix[k]) {
		if (resolvedValue = toValue(mix[k])) {
			string && (string += " ");
			string += resolvedValue;
		}
	}
	return string;
};
var createTailwindMerge = (createConfigFirst, ...createConfigRest) => {
	let configUtils;
	let cacheGet;
	let cacheSet;
	let functionToCall;
	const initTailwindMerge = (classList) => {
		configUtils = createConfigUtils(createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst()));
		cacheGet = configUtils.cache.get;
		cacheSet = configUtils.cache.set;
		functionToCall = tailwindMerge;
		return tailwindMerge(classList);
	};
	const tailwindMerge = (classList) => {
		const cachedResult = cacheGet(classList);
		if (cachedResult) return cachedResult;
		const result = mergeClassList(classList, configUtils);
		cacheSet(classList, result);
		return result;
	};
	functionToCall = initTailwindMerge;
	return (...args) => functionToCall(twJoin(...args));
};
var fallbackThemeArr = [];
var fromTheme = (key) => {
	const themeGetter = (theme) => theme[key] || fallbackThemeArr;
	themeGetter.isThemeGetter = true;
	return themeGetter;
};
var arbitraryValueRegex = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
var arbitraryVariableRegex = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
var fractionRegex = /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/;
var tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
var lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
var colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/;
var shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
var imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
var isFraction = (value) => fractionRegex.test(value);
var isNumber = (value) => !!value && !Number.isNaN(Number(value));
var isInteger = (value) => !!value && Number.isInteger(Number(value));
var isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
var isTshirtSize = (value) => tshirtUnitRegex.test(value);
var isAny = () => true;
var isLengthOnly = (value) => lengthUnitRegex.test(value) && !colorFunctionRegex.test(value);
var isNever = () => false;
var isShadow = (value) => shadowRegex.test(value);
var isImage = (value) => imageRegex.test(value);
var isAnyNonArbitrary = (value) => !isArbitraryValue(value) && !isArbitraryVariable(value);
var isNamedContainerQuery = (value) => value.startsWith("@container") && (value[10] === "/" && value[11] !== void 0 || value[11] === "s" && value[16] !== void 0 && value.startsWith("-size/", 10) || value[11] === "n" && value[18] !== void 0 && value.startsWith("-normal/", 10));
var isArbitrarySize = (value) => getIsArbitraryValue(value, isLabelSize, isNever);
var isArbitraryValue = (value) => arbitraryValueRegex.test(value);
var isArbitraryLength = (value) => getIsArbitraryValue(value, isLabelLength, isLengthOnly);
var isArbitraryNumber = (value) => getIsArbitraryValue(value, isLabelNumber, isNumber);
var isArbitraryWeight = (value) => getIsArbitraryValue(value, isLabelWeight, isAny);
var isArbitraryFamilyName = (value) => getIsArbitraryValue(value, isLabelFamilyName, isNever);
var isArbitraryPosition = (value) => getIsArbitraryValue(value, isLabelPosition, isNever);
var isArbitraryImage = (value) => getIsArbitraryValue(value, isLabelImage, isImage);
var isArbitraryShadow = (value) => getIsArbitraryValue(value, isLabelShadow, isShadow);
var isArbitraryVariable = (value) => arbitraryVariableRegex.test(value);
var isArbitraryVariableLength = (value) => getIsArbitraryVariable(value, isLabelLength);
var isArbitraryVariableFamilyName = (value) => getIsArbitraryVariable(value, isLabelFamilyName);
var isArbitraryVariablePosition = (value) => getIsArbitraryVariable(value, isLabelPosition);
var isArbitraryVariableSize = (value) => getIsArbitraryVariable(value, isLabelSize);
var isArbitraryVariableImage = (value) => getIsArbitraryVariable(value, isLabelImage);
var isArbitraryVariableShadow = (value) => getIsArbitraryVariable(value, isLabelShadow, true);
var isArbitraryVariableWeight = (value) => getIsArbitraryVariable(value, isLabelWeight, true);
var getIsArbitraryValue = (value, testLabel, testValue) => {
	const result = arbitraryValueRegex.exec(value);
	if (result) {
		if (result[1]) return testLabel(result[1]);
		return testValue(result[2]);
	}
	return false;
};
var getIsArbitraryVariable = (value, testLabel, shouldMatchNoLabel = false) => {
	const result = arbitraryVariableRegex.exec(value);
	if (result) {
		if (result[1]) return testLabel(result[1]);
		return shouldMatchNoLabel;
	}
	return false;
};
var isLabelPosition = (label) => label === "position" || label === "percentage";
var isLabelImage = (label) => label === "image" || label === "url";
var isLabelSize = (label) => label === "length" || label === "size" || label === "bg-size";
var isLabelLength = (label) => label === "length";
var isLabelNumber = (label) => label === "number";
var isLabelFamilyName = (label) => label === "family-name";
var isLabelWeight = (label) => label === "number" || label === "weight";
var isLabelShadow = (label) => label === "shadow";
var getDefaultConfig = () => {
	/**
	* Theme getters for theme variable namespaces
	* @see https://tailwindcss.com/docs/theme#theme-variable-namespaces
	*/
	const themeColor = fromTheme("color");
	const themeFont = fromTheme("font");
	const themeText = fromTheme("text");
	const themeFontWeight = fromTheme("font-weight");
	const themeTracking = fromTheme("tracking");
	const themeLeading = fromTheme("leading");
	const themeBreakpoint = fromTheme("breakpoint");
	const themeContainer = fromTheme("container");
	const themeSpacing = fromTheme("spacing");
	const themeRadius = fromTheme("radius");
	const themeShadow = fromTheme("shadow");
	const themeInsetShadow = fromTheme("inset-shadow");
	const themeTextShadow = fromTheme("text-shadow");
	const themeDropShadow = fromTheme("drop-shadow");
	const themeBlur = fromTheme("blur");
	const themePerspective = fromTheme("perspective");
	const themeAspect = fromTheme("aspect");
	const themeEase = fromTheme("ease");
	const themeAnimate = fromTheme("animate");
	/**
	* Helpers to avoid repeating the same scales
	*
	* We use functions that create a new array every time they're called instead of static arrays.
	* This ensures that users who modify any scale by mutating the array (e.g. with `array.push(element)`) don't accidentally mutate arrays in other parts of the config.
	*/
	const scaleBreak = () => [
		"auto",
		"avoid",
		"all",
		"avoid-page",
		"page",
		"left",
		"right",
		"column"
	];
	const scalePosition = () => [
		"center",
		"top",
		"bottom",
		"left",
		"right",
		"top-left",
		"left-top",
		"top-right",
		"right-top",
		"bottom-right",
		"right-bottom",
		"bottom-left",
		"left-bottom"
	];
	const scalePositionWithArbitrary = () => [
		...scalePosition(),
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleOverflow = () => [
		"auto",
		"hidden",
		"clip",
		"visible",
		"scroll"
	];
	const scaleOverscroll = () => [
		"auto",
		"contain",
		"none"
	];
	const scaleUnambiguousSpacing = () => [
		isArbitraryVariable,
		isArbitraryValue,
		themeSpacing
	];
	const scaleInset = () => [
		isFraction,
		"full",
		"auto",
		...scaleUnambiguousSpacing()
	];
	const scaleGridTemplateColsRows = () => [
		isInteger,
		"none",
		"subgrid",
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleGridColRowStartAndEnd = () => [
		"auto",
		{ span: [
			"full",
			isInteger,
			isArbitraryVariable,
			isArbitraryValue
		] },
		isInteger,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleGridColRowStartOrEnd = () => [
		isInteger,
		"auto",
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleGridAutoColsRows = () => [
		"auto",
		"min",
		"max",
		"fr",
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleAlignPrimaryAxis = () => [
		"start",
		"end",
		"center",
		"between",
		"around",
		"evenly",
		"stretch",
		"baseline",
		"center-safe",
		"end-safe"
	];
	const scaleAlignSecondaryAxis = () => [
		"start",
		"end",
		"center",
		"stretch",
		"center-safe",
		"end-safe"
	];
	const scaleMargin = () => ["auto", ...scaleUnambiguousSpacing()];
	const scaleSizing = () => [
		isFraction,
		"auto",
		"full",
		"dvw",
		"dvh",
		"lvw",
		"lvh",
		"svw",
		"svh",
		"min",
		"max",
		"fit",
		...scaleUnambiguousSpacing()
	];
	const scaleSizingInline = () => [
		isFraction,
		"screen",
		"full",
		"dvw",
		"lvw",
		"svw",
		"min",
		"max",
		"fit",
		...scaleUnambiguousSpacing()
	];
	const scaleSizingBlock = () => [
		isFraction,
		"screen",
		"full",
		"lh",
		"dvh",
		"lvh",
		"svh",
		"min",
		"max",
		"fit",
		...scaleUnambiguousSpacing()
	];
	const scaleColor = () => [
		themeColor,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleBgPosition = () => [
		...scalePosition(),
		isArbitraryVariablePosition,
		isArbitraryPosition,
		{ position: [isArbitraryVariable, isArbitraryValue] }
	];
	const scaleBgRepeat = () => ["no-repeat", { repeat: [
		"",
		"x",
		"y",
		"space",
		"round"
	] }];
	const scaleBgSize = () => [
		"auto",
		"cover",
		"contain",
		isArbitraryVariableSize,
		isArbitrarySize,
		{ size: [isArbitraryVariable, isArbitraryValue] }
	];
	const scaleGradientStopPosition = () => [
		isPercent,
		isArbitraryVariableLength,
		isArbitraryLength
	];
	const scaleRadius = () => [
		"",
		"none",
		"full",
		themeRadius,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleBorderWidth = () => [
		"",
		isNumber,
		isArbitraryVariableLength,
		isArbitraryLength
	];
	const scaleLineStyle = () => [
		"solid",
		"dashed",
		"dotted",
		"double"
	];
	const scaleBlendMode = () => [
		"normal",
		"multiply",
		"screen",
		"overlay",
		"darken",
		"lighten",
		"color-dodge",
		"color-burn",
		"hard-light",
		"soft-light",
		"difference",
		"exclusion",
		"hue",
		"saturation",
		"color",
		"luminosity"
	];
	const scaleMaskImagePosition = () => [
		isNumber,
		isPercent,
		isArbitraryVariablePosition,
		isArbitraryPosition
	];
	const scaleBlur = () => [
		"",
		"none",
		themeBlur,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleRotate = () => [
		"none",
		isNumber,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleScale = () => [
		"none",
		isNumber,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleSkew = () => [
		isNumber,
		isArbitraryVariable,
		isArbitraryValue
	];
	const scaleTranslate = () => [
		isFraction,
		"full",
		...scaleUnambiguousSpacing()
	];
	return {
		cacheSize: 500,
		theme: {
			animate: [
				"spin",
				"ping",
				"pulse",
				"bounce"
			],
			aspect: ["video"],
			blur: [isTshirtSize],
			breakpoint: [isTshirtSize],
			color: [isAny],
			container: [isTshirtSize],
			"drop-shadow": [isTshirtSize],
			ease: [
				"in",
				"out",
				"in-out"
			],
			font: [isAnyNonArbitrary],
			"font-weight": [
				"thin",
				"extralight",
				"light",
				"normal",
				"medium",
				"semibold",
				"bold",
				"extrabold",
				"black"
			],
			"inset-shadow": [isTshirtSize],
			leading: [
				"none",
				"tight",
				"snug",
				"normal",
				"relaxed",
				"loose"
			],
			perspective: [
				"dramatic",
				"near",
				"normal",
				"midrange",
				"distant",
				"none"
			],
			radius: [isTshirtSize],
			shadow: [isTshirtSize],
			spacing: ["px", isNumber],
			text: [isTshirtSize],
			"text-shadow": [isTshirtSize],
			tracking: [
				"tighter",
				"tight",
				"normal",
				"wide",
				"wider",
				"widest"
			]
		},
		classGroups: {
			/**
			* Aspect Ratio
			* @see https://tailwindcss.com/docs/aspect-ratio
			*/
			aspect: [{ aspect: [
				"auto",
				"square",
				isFraction,
				isArbitraryValue,
				isArbitraryVariable,
				themeAspect
			] }],
			/**
			* Container
			* @see https://tailwindcss.com/docs/container
			* @deprecated since Tailwind CSS v4.0.0
			*/
			container: ["container"],
			/**
			* Container Type
			* @see https://tailwindcss.com/docs/responsive-design#container-queries
			*/
			"container-type": [{ "@container": [
				"",
				"normal",
				"size",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Container Name
			* @see https://tailwindcss.com/docs/responsive-design#named-containers
			*/
			"container-named": [isNamedContainerQuery],
			/**
			* Columns
			* @see https://tailwindcss.com/docs/columns
			*/
			columns: [{ columns: [
				isNumber,
				isArbitraryValue,
				isArbitraryVariable,
				themeContainer
			] }],
			/**
			* Break After
			* @see https://tailwindcss.com/docs/break-after
			*/
			"break-after": [{ "break-after": scaleBreak() }],
			/**
			* Break Before
			* @see https://tailwindcss.com/docs/break-before
			*/
			"break-before": [{ "break-before": scaleBreak() }],
			/**
			* Break Inside
			* @see https://tailwindcss.com/docs/break-inside
			*/
			"break-inside": [{ "break-inside": [
				"auto",
				"avoid",
				"avoid-page",
				"avoid-column"
			] }],
			/**
			* Box Decoration Break
			* @see https://tailwindcss.com/docs/box-decoration-break
			*/
			"box-decoration": [{ "box-decoration": ["slice", "clone"] }],
			/**
			* Box Sizing
			* @see https://tailwindcss.com/docs/box-sizing
			*/
			box: [{ box: ["border", "content"] }],
			/**
			* Display
			* @see https://tailwindcss.com/docs/display
			*/
			display: [
				"block",
				"inline-block",
				"inline",
				"flex",
				"inline-flex",
				"table",
				"inline-table",
				"table-caption",
				"table-cell",
				"table-column",
				"table-column-group",
				"table-footer-group",
				"table-header-group",
				"table-row-group",
				"table-row",
				"flow-root",
				"grid",
				"inline-grid",
				"contents",
				"list-item",
				"hidden"
			],
			/**
			* Screen Reader Only
			* @see https://tailwindcss.com/docs/display#screen-reader-only
			*/
			sr: ["sr-only", "not-sr-only"],
			/**
			* Floats
			* @see https://tailwindcss.com/docs/float
			*/
			float: [{ float: [
				"right",
				"left",
				"none",
				"start",
				"end"
			] }],
			/**
			* Clear
			* @see https://tailwindcss.com/docs/clear
			*/
			clear: [{ clear: [
				"left",
				"right",
				"both",
				"none",
				"start",
				"end"
			] }],
			/**
			* Isolation
			* @see https://tailwindcss.com/docs/isolation
			*/
			isolation: ["isolate", "isolation-auto"],
			/**
			* Object Fit
			* @see https://tailwindcss.com/docs/object-fit
			*/
			"object-fit": [{ object: [
				"contain",
				"cover",
				"fill",
				"none",
				"scale-down"
			] }],
			/**
			* Object Position
			* @see https://tailwindcss.com/docs/object-position
			*/
			"object-position": [{ object: scalePositionWithArbitrary() }],
			/**
			* Overflow
			* @see https://tailwindcss.com/docs/overflow
			*/
			overflow: [{ overflow: scaleOverflow() }],
			/**
			* Overflow X
			* @see https://tailwindcss.com/docs/overflow
			*/
			"overflow-x": [{ "overflow-x": scaleOverflow() }],
			/**
			* Overflow Y
			* @see https://tailwindcss.com/docs/overflow
			*/
			"overflow-y": [{ "overflow-y": scaleOverflow() }],
			/**
			* Overscroll Behavior
			* @see https://tailwindcss.com/docs/overscroll-behavior
			*/
			overscroll: [{ overscroll: scaleOverscroll() }],
			/**
			* Overscroll Behavior X
			* @see https://tailwindcss.com/docs/overscroll-behavior
			*/
			"overscroll-x": [{ "overscroll-x": scaleOverscroll() }],
			/**
			* Overscroll Behavior Y
			* @see https://tailwindcss.com/docs/overscroll-behavior
			*/
			"overscroll-y": [{ "overscroll-y": scaleOverscroll() }],
			/**
			* Position
			* @see https://tailwindcss.com/docs/position
			*/
			position: [
				"static",
				"fixed",
				"absolute",
				"relative",
				"sticky"
			],
			/**
			* Inset
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			inset: [{ inset: scaleInset() }],
			/**
			* Inset Inline
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			"inset-x": [{ "inset-x": scaleInset() }],
			/**
			* Inset Block
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			"inset-y": [{ "inset-y": scaleInset() }],
			/**
			* Inset Inline Start
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			* @todo class group will be renamed to `inset-s` in next major release
			*/
			start: [{
				"inset-s": scaleInset(),
				/**
				* @deprecated since Tailwind CSS v4.2.0 in favor of `inset-s-*` utilities.
				* @see https://github.com/tailwindlabs/tailwindcss/pull/19613
				*/
				start: scaleInset()
			}],
			/**
			* Inset Inline End
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			* @todo class group will be renamed to `inset-e` in next major release
			*/
			end: [{
				"inset-e": scaleInset(),
				/**
				* @deprecated since Tailwind CSS v4.2.0 in favor of `inset-e-*` utilities.
				* @see https://github.com/tailwindlabs/tailwindcss/pull/19613
				*/
				end: scaleInset()
			}],
			/**
			* Inset Block Start
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			"inset-bs": [{ "inset-bs": scaleInset() }],
			/**
			* Inset Block End
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			"inset-be": [{ "inset-be": scaleInset() }],
			/**
			* Top
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			top: [{ top: scaleInset() }],
			/**
			* Right
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			right: [{ right: scaleInset() }],
			/**
			* Bottom
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			bottom: [{ bottom: scaleInset() }],
			/**
			* Left
			* @see https://tailwindcss.com/docs/top-right-bottom-left
			*/
			left: [{ left: scaleInset() }],
			/**
			* Visibility
			* @see https://tailwindcss.com/docs/visibility
			*/
			visibility: [
				"visible",
				"invisible",
				"collapse"
			],
			/**
			* Z-Index
			* @see https://tailwindcss.com/docs/z-index
			*/
			z: [{ z: [
				isInteger,
				"auto",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Flex Basis
			* @see https://tailwindcss.com/docs/flex-basis
			*/
			basis: [{ basis: [
				isFraction,
				"full",
				"auto",
				themeContainer,
				...scaleUnambiguousSpacing()
			] }],
			/**
			* Flex Direction
			* @see https://tailwindcss.com/docs/flex-direction
			*/
			"flex-direction": [{ flex: [
				"row",
				"row-reverse",
				"col",
				"col-reverse"
			] }],
			/**
			* Flex Wrap
			* @see https://tailwindcss.com/docs/flex-wrap
			*/
			"flex-wrap": [{ flex: [
				"nowrap",
				"wrap",
				"wrap-reverse"
			] }],
			/**
			* Flex
			* @see https://tailwindcss.com/docs/flex
			*/
			flex: [{ flex: [
				isNumber,
				isFraction,
				"auto",
				"initial",
				"none",
				isArbitraryValue
			] }],
			/**
			* Flex Grow
			* @see https://tailwindcss.com/docs/flex-grow
			*/
			grow: [{ grow: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Flex Shrink
			* @see https://tailwindcss.com/docs/flex-shrink
			*/
			shrink: [{ shrink: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Order
			* @see https://tailwindcss.com/docs/order
			*/
			order: [{ order: [
				isInteger,
				"first",
				"last",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Grid Template Columns
			* @see https://tailwindcss.com/docs/grid-template-columns
			*/
			"grid-cols": [{ "grid-cols": scaleGridTemplateColsRows() }],
			/**
			* Grid Column Start / End
			* @see https://tailwindcss.com/docs/grid-column
			*/
			"col-start-end": [{ col: scaleGridColRowStartAndEnd() }],
			/**
			* Grid Column Start
			* @see https://tailwindcss.com/docs/grid-column
			*/
			"col-start": [{ "col-start": scaleGridColRowStartOrEnd() }],
			/**
			* Grid Column End
			* @see https://tailwindcss.com/docs/grid-column
			*/
			"col-end": [{ "col-end": scaleGridColRowStartOrEnd() }],
			/**
			* Grid Template Rows
			* @see https://tailwindcss.com/docs/grid-template-rows
			*/
			"grid-rows": [{ "grid-rows": scaleGridTemplateColsRows() }],
			/**
			* Grid Row Start / End
			* @see https://tailwindcss.com/docs/grid-row
			*/
			"row-start-end": [{ row: scaleGridColRowStartAndEnd() }],
			/**
			* Grid Row Start
			* @see https://tailwindcss.com/docs/grid-row
			*/
			"row-start": [{ "row-start": scaleGridColRowStartOrEnd() }],
			/**
			* Grid Row End
			* @see https://tailwindcss.com/docs/grid-row
			*/
			"row-end": [{ "row-end": scaleGridColRowStartOrEnd() }],
			/**
			* Grid Auto Flow
			* @see https://tailwindcss.com/docs/grid-auto-flow
			*/
			"grid-flow": [{ "grid-flow": [
				"row",
				"col",
				"dense",
				"row-dense",
				"col-dense"
			] }],
			/**
			* Grid Auto Columns
			* @see https://tailwindcss.com/docs/grid-auto-columns
			*/
			"auto-cols": [{ "auto-cols": scaleGridAutoColsRows() }],
			/**
			* Grid Auto Rows
			* @see https://tailwindcss.com/docs/grid-auto-rows
			*/
			"auto-rows": [{ "auto-rows": scaleGridAutoColsRows() }],
			/**
			* Gap
			* @see https://tailwindcss.com/docs/gap
			*/
			gap: [{ gap: scaleUnambiguousSpacing() }],
			/**
			* Gap X
			* @see https://tailwindcss.com/docs/gap
			*/
			"gap-x": [{ "gap-x": scaleUnambiguousSpacing() }],
			/**
			* Gap Y
			* @see https://tailwindcss.com/docs/gap
			*/
			"gap-y": [{ "gap-y": scaleUnambiguousSpacing() }],
			/**
			* Justify Content
			* @see https://tailwindcss.com/docs/justify-content
			*/
			"justify-content": [{ justify: [...scaleAlignPrimaryAxis(), "normal"] }],
			/**
			* Justify Items
			* @see https://tailwindcss.com/docs/justify-items
			*/
			"justify-items": [{ "justify-items": [...scaleAlignSecondaryAxis(), "normal"] }],
			/**
			* Justify Self
			* @see https://tailwindcss.com/docs/justify-self
			*/
			"justify-self": [{ "justify-self": ["auto", ...scaleAlignSecondaryAxis()] }],
			/**
			* Align Content
			* @see https://tailwindcss.com/docs/align-content
			*/
			"align-content": [{ content: ["normal", ...scaleAlignPrimaryAxis()] }],
			/**
			* Align Items
			* @see https://tailwindcss.com/docs/align-items
			*/
			"align-items": [{ items: [...scaleAlignSecondaryAxis(), { baseline: ["", "last"] }] }],
			/**
			* Align Self
			* @see https://tailwindcss.com/docs/align-self
			*/
			"align-self": [{ self: [
				"auto",
				...scaleAlignSecondaryAxis(),
				{ baseline: ["", "last"] }
			] }],
			/**
			* Place Content
			* @see https://tailwindcss.com/docs/place-content
			*/
			"place-content": [{ "place-content": scaleAlignPrimaryAxis() }],
			/**
			* Place Items
			* @see https://tailwindcss.com/docs/place-items
			*/
			"place-items": [{ "place-items": [...scaleAlignSecondaryAxis(), "baseline"] }],
			/**
			* Place Self
			* @see https://tailwindcss.com/docs/place-self
			*/
			"place-self": [{ "place-self": ["auto", ...scaleAlignSecondaryAxis()] }],
			/**
			* Padding
			* @see https://tailwindcss.com/docs/padding
			*/
			p: [{ p: scaleUnambiguousSpacing() }],
			/**
			* Padding Inline
			* @see https://tailwindcss.com/docs/padding
			*/
			px: [{ px: scaleUnambiguousSpacing() }],
			/**
			* Padding Block
			* @see https://tailwindcss.com/docs/padding
			*/
			py: [{ py: scaleUnambiguousSpacing() }],
			/**
			* Padding Inline Start
			* @see https://tailwindcss.com/docs/padding
			*/
			ps: [{ ps: scaleUnambiguousSpacing() }],
			/**
			* Padding Inline End
			* @see https://tailwindcss.com/docs/padding
			*/
			pe: [{ pe: scaleUnambiguousSpacing() }],
			/**
			* Padding Block Start
			* @see https://tailwindcss.com/docs/padding
			*/
			pbs: [{ pbs: scaleUnambiguousSpacing() }],
			/**
			* Padding Block End
			* @see https://tailwindcss.com/docs/padding
			*/
			pbe: [{ pbe: scaleUnambiguousSpacing() }],
			/**
			* Padding Top
			* @see https://tailwindcss.com/docs/padding
			*/
			pt: [{ pt: scaleUnambiguousSpacing() }],
			/**
			* Padding Right
			* @see https://tailwindcss.com/docs/padding
			*/
			pr: [{ pr: scaleUnambiguousSpacing() }],
			/**
			* Padding Bottom
			* @see https://tailwindcss.com/docs/padding
			*/
			pb: [{ pb: scaleUnambiguousSpacing() }],
			/**
			* Padding Left
			* @see https://tailwindcss.com/docs/padding
			*/
			pl: [{ pl: scaleUnambiguousSpacing() }],
			/**
			* Margin
			* @see https://tailwindcss.com/docs/margin
			*/
			m: [{ m: scaleMargin() }],
			/**
			* Margin Inline
			* @see https://tailwindcss.com/docs/margin
			*/
			mx: [{ mx: scaleMargin() }],
			/**
			* Margin Block
			* @see https://tailwindcss.com/docs/margin
			*/
			my: [{ my: scaleMargin() }],
			/**
			* Margin Inline Start
			* @see https://tailwindcss.com/docs/margin
			*/
			ms: [{ ms: scaleMargin() }],
			/**
			* Margin Inline End
			* @see https://tailwindcss.com/docs/margin
			*/
			me: [{ me: scaleMargin() }],
			/**
			* Margin Block Start
			* @see https://tailwindcss.com/docs/margin
			*/
			mbs: [{ mbs: scaleMargin() }],
			/**
			* Margin Block End
			* @see https://tailwindcss.com/docs/margin
			*/
			mbe: [{ mbe: scaleMargin() }],
			/**
			* Margin Top
			* @see https://tailwindcss.com/docs/margin
			*/
			mt: [{ mt: scaleMargin() }],
			/**
			* Margin Right
			* @see https://tailwindcss.com/docs/margin
			*/
			mr: [{ mr: scaleMargin() }],
			/**
			* Margin Bottom
			* @see https://tailwindcss.com/docs/margin
			*/
			mb: [{ mb: scaleMargin() }],
			/**
			* Margin Left
			* @see https://tailwindcss.com/docs/margin
			*/
			ml: [{ ml: scaleMargin() }],
			/**
			* Space Between X
			* @see https://tailwindcss.com/docs/margin#adding-space-between-children
			*/
			"space-x": [{ "space-x": scaleUnambiguousSpacing() }],
			/**
			* Space Between X Reverse
			* @see https://tailwindcss.com/docs/margin#adding-space-between-children
			*/
			"space-x-reverse": ["space-x-reverse"],
			/**
			* Space Between Y
			* @see https://tailwindcss.com/docs/margin#adding-space-between-children
			*/
			"space-y": [{ "space-y": scaleUnambiguousSpacing() }],
			/**
			* Space Between Y Reverse
			* @see https://tailwindcss.com/docs/margin#adding-space-between-children
			*/
			"space-y-reverse": ["space-y-reverse"],
			/**
			* Size
			* @see https://tailwindcss.com/docs/width#setting-both-width-and-height
			*/
			size: [{ size: scaleSizing() }],
			/**
			* Inline Size
			* @see https://tailwindcss.com/docs/width
			*/
			"inline-size": [{ inline: ["auto", ...scaleSizingInline()] }],
			/**
			* Min-Inline Size
			* @see https://tailwindcss.com/docs/min-width
			*/
			"min-inline-size": [{ "min-inline": ["auto", ...scaleSizingInline()] }],
			/**
			* Max-Inline Size
			* @see https://tailwindcss.com/docs/max-width
			*/
			"max-inline-size": [{ "max-inline": ["none", ...scaleSizingInline()] }],
			/**
			* Block Size
			* @see https://tailwindcss.com/docs/height
			*/
			"block-size": [{ block: ["auto", ...scaleSizingBlock()] }],
			/**
			* Min-Block Size
			* @see https://tailwindcss.com/docs/min-height
			*/
			"min-block-size": [{ "min-block": ["auto", ...scaleSizingBlock()] }],
			/**
			* Max-Block Size
			* @see https://tailwindcss.com/docs/max-height
			*/
			"max-block-size": [{ "max-block": ["none", ...scaleSizingBlock()] }],
			/**
			* Width
			* @see https://tailwindcss.com/docs/width
			*/
			w: [{ w: [
				themeContainer,
				"screen",
				...scaleSizing()
			] }],
			/**
			* Min-Width
			* @see https://tailwindcss.com/docs/min-width
			*/
			"min-w": [{ "min-w": [
				themeContainer,
				"screen",
				"none",
				...scaleSizing()
			] }],
			/**
			* Max-Width
			* @see https://tailwindcss.com/docs/max-width
			*/
			"max-w": [{ "max-w": [
				themeContainer,
				"screen",
				"none",
				"prose",
				{ screen: [themeBreakpoint] },
				...scaleSizing()
			] }],
			/**
			* Height
			* @see https://tailwindcss.com/docs/height
			*/
			h: [{ h: [
				"screen",
				"lh",
				...scaleSizing()
			] }],
			/**
			* Min-Height
			* @see https://tailwindcss.com/docs/min-height
			*/
			"min-h": [{ "min-h": [
				"screen",
				"lh",
				"none",
				...scaleSizing()
			] }],
			/**
			* Max-Height
			* @see https://tailwindcss.com/docs/max-height
			*/
			"max-h": [{ "max-h": [
				"screen",
				"lh",
				...scaleSizing()
			] }],
			/**
			* Font Size
			* @see https://tailwindcss.com/docs/font-size
			*/
			"font-size": [{ text: [
				"base",
				themeText,
				isArbitraryVariableLength,
				isArbitraryLength
			] }],
			/**
			* Font Smoothing
			* @see https://tailwindcss.com/docs/font-smoothing
			*/
			"font-smoothing": ["antialiased", "subpixel-antialiased"],
			/**
			* Font Style
			* @see https://tailwindcss.com/docs/font-style
			*/
			"font-style": ["italic", "not-italic"],
			/**
			* Font Weight
			* @see https://tailwindcss.com/docs/font-weight
			*/
			"font-weight": [{ font: [
				themeFontWeight,
				isArbitraryVariableWeight,
				isArbitraryWeight
			] }],
			/**
			* Font Stretch
			* @see https://tailwindcss.com/docs/font-stretch
			*/
			"font-stretch": [{ "font-stretch": [
				"ultra-condensed",
				"extra-condensed",
				"condensed",
				"semi-condensed",
				"normal",
				"semi-expanded",
				"expanded",
				"extra-expanded",
				"ultra-expanded",
				isPercent,
				isArbitraryValue
			] }],
			/**
			* Font Family
			* @see https://tailwindcss.com/docs/font-family
			*/
			"font-family": [{ font: [
				isArbitraryVariableFamilyName,
				isArbitraryFamilyName,
				themeFont
			] }],
			/**
			* Font Feature Settings
			* @see https://tailwindcss.com/docs/font-feature-settings
			*/
			"font-features": [{ "font-features": [isArbitraryValue] }],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-normal": ["normal-nums"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-ordinal": ["ordinal"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-slashed-zero": ["slashed-zero"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-figure": ["lining-nums", "oldstyle-nums"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-spacing": ["proportional-nums", "tabular-nums"],
			/**
			* Font Variant Numeric
			* @see https://tailwindcss.com/docs/font-variant-numeric
			*/
			"fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
			/**
			* Letter Spacing
			* @see https://tailwindcss.com/docs/letter-spacing
			*/
			tracking: [{ tracking: [
				themeTracking,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Line Clamp
			* @see https://tailwindcss.com/docs/line-clamp
			*/
			"line-clamp": [{ "line-clamp": [
				isNumber,
				"none",
				isArbitraryVariable,
				isArbitraryNumber
			] }],
			/**
			* Line Height
			* @see https://tailwindcss.com/docs/line-height
			*/
			leading: [{ leading: [themeLeading, ...scaleUnambiguousSpacing()] }],
			/**
			* List Style Image
			* @see https://tailwindcss.com/docs/list-style-image
			*/
			"list-image": [{ "list-image": [
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* List Style Position
			* @see https://tailwindcss.com/docs/list-style-position
			*/
			"list-style-position": [{ list: ["inside", "outside"] }],
			/**
			* List Style Type
			* @see https://tailwindcss.com/docs/list-style-type
			*/
			"list-style-type": [{ list: [
				"disc",
				"decimal",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Text Alignment
			* @see https://tailwindcss.com/docs/text-align
			*/
			"text-alignment": [{ text: [
				"left",
				"center",
				"right",
				"justify",
				"start",
				"end"
			] }],
			/**
			* Placeholder Color
			* @deprecated since Tailwind CSS v3.0.0
			* @see https://v3.tailwindcss.com/docs/placeholder-color
			*/
			"placeholder-color": [{ placeholder: scaleColor() }],
			/**
			* Text Color
			* @see https://tailwindcss.com/docs/text-color
			*/
			"text-color": [{ text: scaleColor() }],
			/**
			* Text Decoration
			* @see https://tailwindcss.com/docs/text-decoration
			*/
			"text-decoration": [
				"underline",
				"overline",
				"line-through",
				"no-underline"
			],
			/**
			* Text Decoration Style
			* @see https://tailwindcss.com/docs/text-decoration-style
			*/
			"text-decoration-style": [{ decoration: [...scaleLineStyle(), "wavy"] }],
			/**
			* Text Decoration Thickness
			* @see https://tailwindcss.com/docs/text-decoration-thickness
			*/
			"text-decoration-thickness": [{ decoration: [
				isNumber,
				"from-font",
				"auto",
				isArbitraryVariable,
				isArbitraryLength
			] }],
			/**
			* Text Decoration Color
			* @see https://tailwindcss.com/docs/text-decoration-color
			*/
			"text-decoration-color": [{ decoration: scaleColor() }],
			/**
			* Text Underline Offset
			* @see https://tailwindcss.com/docs/text-underline-offset
			*/
			"underline-offset": [{ "underline-offset": [
				isNumber,
				"auto",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Text Transform
			* @see https://tailwindcss.com/docs/text-transform
			*/
			"text-transform": [
				"uppercase",
				"lowercase",
				"capitalize",
				"normal-case"
			],
			/**
			* Text Overflow
			* @see https://tailwindcss.com/docs/text-overflow
			*/
			"text-overflow": [
				"truncate",
				"text-ellipsis",
				"text-clip"
			],
			/**
			* Text Wrap
			* @see https://tailwindcss.com/docs/text-wrap
			*/
			"text-wrap": [{ text: [
				"wrap",
				"nowrap",
				"balance",
				"pretty"
			] }],
			/**
			* Text Indent
			* @see https://tailwindcss.com/docs/text-indent
			*/
			indent: [{ indent: scaleUnambiguousSpacing() }],
			/**
			* Tab Size
			* @see https://tailwindcss.com/docs/tab-size
			*/
			"tab-size": [{ tab: [
				isInteger,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Vertical Alignment
			* @see https://tailwindcss.com/docs/vertical-align
			*/
			"vertical-align": [{ align: [
				"baseline",
				"top",
				"middle",
				"bottom",
				"text-top",
				"text-bottom",
				"sub",
				"super",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Whitespace
			* @see https://tailwindcss.com/docs/whitespace
			*/
			whitespace: [{ whitespace: [
				"normal",
				"nowrap",
				"pre",
				"pre-line",
				"pre-wrap",
				"break-spaces"
			] }],
			/**
			* Word Break
			* @see https://tailwindcss.com/docs/word-break
			*/
			break: [{ break: [
				"normal",
				"words",
				"all",
				"keep"
			] }],
			/**
			* Overflow Wrap
			* @see https://tailwindcss.com/docs/overflow-wrap
			*/
			wrap: [{ wrap: [
				"break-word",
				"anywhere",
				"normal"
			] }],
			/**
			* Hyphens
			* @see https://tailwindcss.com/docs/hyphens
			*/
			hyphens: [{ hyphens: [
				"none",
				"manual",
				"auto"
			] }],
			/**
			* Content
			* @see https://tailwindcss.com/docs/content
			*/
			content: [{ content: [
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Background Attachment
			* @see https://tailwindcss.com/docs/background-attachment
			*/
			"bg-attachment": [{ bg: [
				"fixed",
				"local",
				"scroll"
			] }],
			/**
			* Background Clip
			* @see https://tailwindcss.com/docs/background-clip
			*/
			"bg-clip": [{ "bg-clip": [
				"border",
				"padding",
				"content",
				"text"
			] }],
			/**
			* Background Origin
			* @see https://tailwindcss.com/docs/background-origin
			*/
			"bg-origin": [{ "bg-origin": [
				"border",
				"padding",
				"content"
			] }],
			/**
			* Background Position
			* @see https://tailwindcss.com/docs/background-position
			*/
			"bg-position": [{ bg: scaleBgPosition() }],
			/**
			* Background Repeat
			* @see https://tailwindcss.com/docs/background-repeat
			*/
			"bg-repeat": [{ bg: scaleBgRepeat() }],
			/**
			* Background Size
			* @see https://tailwindcss.com/docs/background-size
			*/
			"bg-size": [{ bg: scaleBgSize() }],
			/**
			* Background Image
			* @see https://tailwindcss.com/docs/background-image
			*/
			"bg-image": [{ bg: [
				"none",
				{
					linear: [
						{ to: [
							"t",
							"tr",
							"r",
							"br",
							"b",
							"bl",
							"l",
							"tl"
						] },
						isInteger,
						isArbitraryVariable,
						isArbitraryValue
					],
					radial: [
						"",
						isArbitraryVariable,
						isArbitraryValue
					],
					conic: [
						isInteger,
						isArbitraryVariable,
						isArbitraryValue
					]
				},
				isArbitraryVariableImage,
				isArbitraryImage
			] }],
			/**
			* Background Color
			* @see https://tailwindcss.com/docs/background-color
			*/
			"bg-color": [{ bg: scaleColor() }],
			/**
			* Gradient Color Stops From Position
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-from-pos": [{ from: scaleGradientStopPosition() }],
			/**
			* Gradient Color Stops Via Position
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-via-pos": [{ via: scaleGradientStopPosition() }],
			/**
			* Gradient Color Stops To Position
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-to-pos": [{ to: scaleGradientStopPosition() }],
			/**
			* Gradient Color Stops From
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-from": [{ from: scaleColor() }],
			/**
			* Gradient Color Stops Via
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-via": [{ via: scaleColor() }],
			/**
			* Gradient Color Stops To
			* @see https://tailwindcss.com/docs/gradient-color-stops
			*/
			"gradient-to": [{ to: scaleColor() }],
			/**
			* Border Radius
			* @see https://tailwindcss.com/docs/border-radius
			*/
			rounded: [{ rounded: scaleRadius() }],
			/**
			* Border Radius Start
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-s": [{ "rounded-s": scaleRadius() }],
			/**
			* Border Radius End
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-e": [{ "rounded-e": scaleRadius() }],
			/**
			* Border Radius Top
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-t": [{ "rounded-t": scaleRadius() }],
			/**
			* Border Radius Right
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-r": [{ "rounded-r": scaleRadius() }],
			/**
			* Border Radius Bottom
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-b": [{ "rounded-b": scaleRadius() }],
			/**
			* Border Radius Left
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-l": [{ "rounded-l": scaleRadius() }],
			/**
			* Border Radius Start Start
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-ss": [{ "rounded-ss": scaleRadius() }],
			/**
			* Border Radius Start End
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-se": [{ "rounded-se": scaleRadius() }],
			/**
			* Border Radius End End
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-ee": [{ "rounded-ee": scaleRadius() }],
			/**
			* Border Radius End Start
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-es": [{ "rounded-es": scaleRadius() }],
			/**
			* Border Radius Top Left
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-tl": [{ "rounded-tl": scaleRadius() }],
			/**
			* Border Radius Top Right
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-tr": [{ "rounded-tr": scaleRadius() }],
			/**
			* Border Radius Bottom Right
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-br": [{ "rounded-br": scaleRadius() }],
			/**
			* Border Radius Bottom Left
			* @see https://tailwindcss.com/docs/border-radius
			*/
			"rounded-bl": [{ "rounded-bl": scaleRadius() }],
			/**
			* Border Width
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w": [{ border: scaleBorderWidth() }],
			/**
			* Border Width Inline
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-x": [{ "border-x": scaleBorderWidth() }],
			/**
			* Border Width Block
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-y": [{ "border-y": scaleBorderWidth() }],
			/**
			* Border Width Inline Start
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-s": [{ "border-s": scaleBorderWidth() }],
			/**
			* Border Width Inline End
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-e": [{ "border-e": scaleBorderWidth() }],
			/**
			* Border Width Block Start
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-bs": [{ "border-bs": scaleBorderWidth() }],
			/**
			* Border Width Block End
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-be": [{ "border-be": scaleBorderWidth() }],
			/**
			* Border Width Top
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-t": [{ "border-t": scaleBorderWidth() }],
			/**
			* Border Width Right
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-r": [{ "border-r": scaleBorderWidth() }],
			/**
			* Border Width Bottom
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-b": [{ "border-b": scaleBorderWidth() }],
			/**
			* Border Width Left
			* @see https://tailwindcss.com/docs/border-width
			*/
			"border-w-l": [{ "border-l": scaleBorderWidth() }],
			/**
			* Divide Width X
			* @see https://tailwindcss.com/docs/border-width#between-children
			*/
			"divide-x": [{ "divide-x": scaleBorderWidth() }],
			/**
			* Divide Width X Reverse
			* @see https://tailwindcss.com/docs/border-width#between-children
			*/
			"divide-x-reverse": ["divide-x-reverse"],
			/**
			* Divide Width Y
			* @see https://tailwindcss.com/docs/border-width#between-children
			*/
			"divide-y": [{ "divide-y": scaleBorderWidth() }],
			/**
			* Divide Width Y Reverse
			* @see https://tailwindcss.com/docs/border-width#between-children
			*/
			"divide-y-reverse": ["divide-y-reverse"],
			/**
			* Border Style
			* @see https://tailwindcss.com/docs/border-style
			*/
			"border-style": [{ border: [
				...scaleLineStyle(),
				"hidden",
				"none"
			] }],
			/**
			* Divide Style
			* @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
			*/
			"divide-style": [{ divide: [
				...scaleLineStyle(),
				"hidden",
				"none"
			] }],
			/**
			* Border Color
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color": [{ border: scaleColor() }],
			/**
			* Border Color Inline
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-x": [{ "border-x": scaleColor() }],
			/**
			* Border Color Block
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-y": [{ "border-y": scaleColor() }],
			/**
			* Border Color Inline Start
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-s": [{ "border-s": scaleColor() }],
			/**
			* Border Color Inline End
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-e": [{ "border-e": scaleColor() }],
			/**
			* Border Color Block Start
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-bs": [{ "border-bs": scaleColor() }],
			/**
			* Border Color Block End
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-be": [{ "border-be": scaleColor() }],
			/**
			* Border Color Top
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-t": [{ "border-t": scaleColor() }],
			/**
			* Border Color Right
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-r": [{ "border-r": scaleColor() }],
			/**
			* Border Color Bottom
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-b": [{ "border-b": scaleColor() }],
			/**
			* Border Color Left
			* @see https://tailwindcss.com/docs/border-color
			*/
			"border-color-l": [{ "border-l": scaleColor() }],
			/**
			* Divide Color
			* @see https://tailwindcss.com/docs/divide-color
			*/
			"divide-color": [{ divide: scaleColor() }],
			/**
			* Outline Style
			* @see https://tailwindcss.com/docs/outline-style
			*/
			"outline-style": [{ outline: [
				...scaleLineStyle(),
				"none",
				"hidden"
			] }],
			/**
			* Outline Offset
			* @see https://tailwindcss.com/docs/outline-offset
			*/
			"outline-offset": [{ "outline-offset": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Outline Width
			* @see https://tailwindcss.com/docs/outline-width
			*/
			"outline-w": [{ outline: [
				"",
				isNumber,
				isArbitraryVariableLength,
				isArbitraryLength
			] }],
			/**
			* Outline Color
			* @see https://tailwindcss.com/docs/outline-color
			*/
			"outline-color": [{ outline: scaleColor() }],
			/**
			* Box Shadow
			* @see https://tailwindcss.com/docs/box-shadow
			*/
			shadow: [{ shadow: [
				"",
				"none",
				themeShadow,
				isArbitraryVariableShadow,
				isArbitraryShadow
			] }],
			/**
			* Box Shadow Color
			* @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
			*/
			"shadow-color": [{ shadow: scaleColor() }],
			/**
			* Inset Box Shadow
			* @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
			*/
			"inset-shadow": [{ "inset-shadow": [
				"none",
				themeInsetShadow,
				isArbitraryVariableShadow,
				isArbitraryShadow
			] }],
			/**
			* Inset Box Shadow Color
			* @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
			*/
			"inset-shadow-color": [{ "inset-shadow": scaleColor() }],
			/**
			* Ring Width
			* @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
			*/
			"ring-w": [{ ring: scaleBorderWidth() }],
			/**
			* Ring Width Inset
			* @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
			* @deprecated since Tailwind CSS v4.0.0
			* @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
			*/
			"ring-w-inset": ["ring-inset"],
			/**
			* Ring Color
			* @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
			*/
			"ring-color": [{ ring: scaleColor() }],
			/**
			* Ring Offset Width
			* @see https://v3.tailwindcss.com/docs/ring-offset-width
			* @deprecated since Tailwind CSS v4.0.0
			* @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
			*/
			"ring-offset-w": [{ "ring-offset": [isNumber, isArbitraryLength] }],
			/**
			* Ring Offset Color
			* @see https://v3.tailwindcss.com/docs/ring-offset-color
			* @deprecated since Tailwind CSS v4.0.0
			* @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
			*/
			"ring-offset-color": [{ "ring-offset": scaleColor() }],
			/**
			* Inset Ring Width
			* @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
			*/
			"inset-ring-w": [{ "inset-ring": scaleBorderWidth() }],
			/**
			* Inset Ring Color
			* @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
			*/
			"inset-ring-color": [{ "inset-ring": scaleColor() }],
			/**
			* Text Shadow
			* @see https://tailwindcss.com/docs/text-shadow
			*/
			"text-shadow": [{ "text-shadow": [
				"none",
				themeTextShadow,
				isArbitraryVariableShadow,
				isArbitraryShadow
			] }],
			/**
			* Text Shadow Color
			* @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
			*/
			"text-shadow-color": [{ "text-shadow": scaleColor() }],
			/**
			* Opacity
			* @see https://tailwindcss.com/docs/opacity
			*/
			opacity: [{ opacity: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Mix Blend Mode
			* @see https://tailwindcss.com/docs/mix-blend-mode
			*/
			"mix-blend": [{ "mix-blend": [
				...scaleBlendMode(),
				"plus-darker",
				"plus-lighter"
			] }],
			/**
			* Background Blend Mode
			* @see https://tailwindcss.com/docs/background-blend-mode
			*/
			"bg-blend": [{ "bg-blend": scaleBlendMode() }],
			/**
			* Mask Clip
			* @see https://tailwindcss.com/docs/mask-clip
			*/
			"mask-clip": [{ "mask-clip": [
				"border",
				"padding",
				"content",
				"fill",
				"stroke",
				"view"
			] }, "mask-no-clip"],
			/**
			* Mask Composite
			* @see https://tailwindcss.com/docs/mask-composite
			*/
			"mask-composite": [{ mask: [
				"add",
				"subtract",
				"intersect",
				"exclude"
			] }],
			/**
			* Mask Image
			* @see https://tailwindcss.com/docs/mask-image
			*/
			"mask-image-linear-pos": [{ "mask-linear": [isNumber] }],
			"mask-image-linear-from-pos": [{ "mask-linear-from": scaleMaskImagePosition() }],
			"mask-image-linear-to-pos": [{ "mask-linear-to": scaleMaskImagePosition() }],
			"mask-image-linear-from-color": [{ "mask-linear-from": scaleColor() }],
			"mask-image-linear-to-color": [{ "mask-linear-to": scaleColor() }],
			"mask-image-t-from-pos": [{ "mask-t-from": scaleMaskImagePosition() }],
			"mask-image-t-to-pos": [{ "mask-t-to": scaleMaskImagePosition() }],
			"mask-image-t-from-color": [{ "mask-t-from": scaleColor() }],
			"mask-image-t-to-color": [{ "mask-t-to": scaleColor() }],
			"mask-image-r-from-pos": [{ "mask-r-from": scaleMaskImagePosition() }],
			"mask-image-r-to-pos": [{ "mask-r-to": scaleMaskImagePosition() }],
			"mask-image-r-from-color": [{ "mask-r-from": scaleColor() }],
			"mask-image-r-to-color": [{ "mask-r-to": scaleColor() }],
			"mask-image-b-from-pos": [{ "mask-b-from": scaleMaskImagePosition() }],
			"mask-image-b-to-pos": [{ "mask-b-to": scaleMaskImagePosition() }],
			"mask-image-b-from-color": [{ "mask-b-from": scaleColor() }],
			"mask-image-b-to-color": [{ "mask-b-to": scaleColor() }],
			"mask-image-l-from-pos": [{ "mask-l-from": scaleMaskImagePosition() }],
			"mask-image-l-to-pos": [{ "mask-l-to": scaleMaskImagePosition() }],
			"mask-image-l-from-color": [{ "mask-l-from": scaleColor() }],
			"mask-image-l-to-color": [{ "mask-l-to": scaleColor() }],
			"mask-image-x-from-pos": [{ "mask-x-from": scaleMaskImagePosition() }],
			"mask-image-x-to-pos": [{ "mask-x-to": scaleMaskImagePosition() }],
			"mask-image-x-from-color": [{ "mask-x-from": scaleColor() }],
			"mask-image-x-to-color": [{ "mask-x-to": scaleColor() }],
			"mask-image-y-from-pos": [{ "mask-y-from": scaleMaskImagePosition() }],
			"mask-image-y-to-pos": [{ "mask-y-to": scaleMaskImagePosition() }],
			"mask-image-y-from-color": [{ "mask-y-from": scaleColor() }],
			"mask-image-y-to-color": [{ "mask-y-to": scaleColor() }],
			"mask-image-radial": [{ "mask-radial": [isArbitraryVariable, isArbitraryValue] }],
			"mask-image-radial-from-pos": [{ "mask-radial-from": scaleMaskImagePosition() }],
			"mask-image-radial-to-pos": [{ "mask-radial-to": scaleMaskImagePosition() }],
			"mask-image-radial-from-color": [{ "mask-radial-from": scaleColor() }],
			"mask-image-radial-to-color": [{ "mask-radial-to": scaleColor() }],
			"mask-image-radial-shape": [{ "mask-radial": ["circle", "ellipse"] }],
			"mask-image-radial-size": [{ "mask-radial": [{
				closest: ["side", "corner"],
				farthest: ["side", "corner"]
			}] }],
			"mask-image-radial-pos": [{ "mask-radial-at": scalePosition() }],
			"mask-image-conic-pos": [{ "mask-conic": [isNumber] }],
			"mask-image-conic-from-pos": [{ "mask-conic-from": scaleMaskImagePosition() }],
			"mask-image-conic-to-pos": [{ "mask-conic-to": scaleMaskImagePosition() }],
			"mask-image-conic-from-color": [{ "mask-conic-from": scaleColor() }],
			"mask-image-conic-to-color": [{ "mask-conic-to": scaleColor() }],
			/**
			* Mask Mode
			* @see https://tailwindcss.com/docs/mask-mode
			*/
			"mask-mode": [{ mask: [
				"alpha",
				"luminance",
				"match"
			] }],
			/**
			* Mask Origin
			* @see https://tailwindcss.com/docs/mask-origin
			*/
			"mask-origin": [{ "mask-origin": [
				"border",
				"padding",
				"content",
				"fill",
				"stroke",
				"view"
			] }],
			/**
			* Mask Position
			* @see https://tailwindcss.com/docs/mask-position
			*/
			"mask-position": [{ mask: scaleBgPosition() }],
			/**
			* Mask Repeat
			* @see https://tailwindcss.com/docs/mask-repeat
			*/
			"mask-repeat": [{ mask: scaleBgRepeat() }],
			/**
			* Mask Size
			* @see https://tailwindcss.com/docs/mask-size
			*/
			"mask-size": [{ mask: scaleBgSize() }],
			/**
			* Mask Type
			* @see https://tailwindcss.com/docs/mask-type
			*/
			"mask-type": [{ "mask-type": ["alpha", "luminance"] }],
			/**
			* Mask Image
			* @see https://tailwindcss.com/docs/mask-image
			*/
			"mask-image": [{ mask: [
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Filter
			* @see https://tailwindcss.com/docs/filter
			*/
			filter: [{ filter: [
				"",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Blur
			* @see https://tailwindcss.com/docs/blur
			*/
			blur: [{ blur: scaleBlur() }],
			/**
			* Brightness
			* @see https://tailwindcss.com/docs/brightness
			*/
			brightness: [{ brightness: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Contrast
			* @see https://tailwindcss.com/docs/contrast
			*/
			contrast: [{ contrast: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Drop Shadow
			* @see https://tailwindcss.com/docs/drop-shadow
			*/
			"drop-shadow": [{ "drop-shadow": [
				"",
				"none",
				themeDropShadow,
				isArbitraryVariableShadow,
				isArbitraryShadow
			] }],
			/**
			* Drop Shadow Color
			* @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
			*/
			"drop-shadow-color": [{ "drop-shadow": scaleColor() }],
			/**
			* Grayscale
			* @see https://tailwindcss.com/docs/grayscale
			*/
			grayscale: [{ grayscale: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Hue Rotate
			* @see https://tailwindcss.com/docs/hue-rotate
			*/
			"hue-rotate": [{ "hue-rotate": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Invert
			* @see https://tailwindcss.com/docs/invert
			*/
			invert: [{ invert: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Saturate
			* @see https://tailwindcss.com/docs/saturate
			*/
			saturate: [{ saturate: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Sepia
			* @see https://tailwindcss.com/docs/sepia
			*/
			sepia: [{ sepia: [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Filter
			* @see https://tailwindcss.com/docs/backdrop-filter
			*/
			"backdrop-filter": [{ "backdrop-filter": [
				"",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Blur
			* @see https://tailwindcss.com/docs/backdrop-blur
			*/
			"backdrop-blur": [{ "backdrop-blur": scaleBlur() }],
			/**
			* Backdrop Brightness
			* @see https://tailwindcss.com/docs/backdrop-brightness
			*/
			"backdrop-brightness": [{ "backdrop-brightness": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Contrast
			* @see https://tailwindcss.com/docs/backdrop-contrast
			*/
			"backdrop-contrast": [{ "backdrop-contrast": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Grayscale
			* @see https://tailwindcss.com/docs/backdrop-grayscale
			*/
			"backdrop-grayscale": [{ "backdrop-grayscale": [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Hue Rotate
			* @see https://tailwindcss.com/docs/backdrop-hue-rotate
			*/
			"backdrop-hue-rotate": [{ "backdrop-hue-rotate": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Invert
			* @see https://tailwindcss.com/docs/backdrop-invert
			*/
			"backdrop-invert": [{ "backdrop-invert": [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Opacity
			* @see https://tailwindcss.com/docs/backdrop-opacity
			*/
			"backdrop-opacity": [{ "backdrop-opacity": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Saturate
			* @see https://tailwindcss.com/docs/backdrop-saturate
			*/
			"backdrop-saturate": [{ "backdrop-saturate": [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backdrop Sepia
			* @see https://tailwindcss.com/docs/backdrop-sepia
			*/
			"backdrop-sepia": [{ "backdrop-sepia": [
				"",
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Border Collapse
			* @see https://tailwindcss.com/docs/border-collapse
			*/
			"border-collapse": [{ border: ["collapse", "separate"] }],
			/**
			* Border Spacing
			* @see https://tailwindcss.com/docs/border-spacing
			*/
			"border-spacing": [{ "border-spacing": scaleUnambiguousSpacing() }],
			/**
			* Border Spacing X
			* @see https://tailwindcss.com/docs/border-spacing
			*/
			"border-spacing-x": [{ "border-spacing-x": scaleUnambiguousSpacing() }],
			/**
			* Border Spacing Y
			* @see https://tailwindcss.com/docs/border-spacing
			*/
			"border-spacing-y": [{ "border-spacing-y": scaleUnambiguousSpacing() }],
			/**
			* Table Layout
			* @see https://tailwindcss.com/docs/table-layout
			*/
			"table-layout": [{ table: ["auto", "fixed"] }],
			/**
			* Caption Side
			* @see https://tailwindcss.com/docs/caption-side
			*/
			caption: [{ caption: ["top", "bottom"] }],
			/**
			* Transition Property
			* @see https://tailwindcss.com/docs/transition-property
			*/
			transition: [{ transition: [
				"",
				"all",
				"colors",
				"opacity",
				"shadow",
				"transform",
				"none",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Transition Behavior
			* @see https://tailwindcss.com/docs/transition-behavior
			*/
			"transition-behavior": [{ transition: ["normal", "discrete"] }],
			/**
			* Transition Duration
			* @see https://tailwindcss.com/docs/transition-duration
			*/
			duration: [{ duration: [
				isNumber,
				"initial",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Transition Timing Function
			* @see https://tailwindcss.com/docs/transition-timing-function
			*/
			ease: [{ ease: [
				"linear",
				"initial",
				themeEase,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Transition Delay
			* @see https://tailwindcss.com/docs/transition-delay
			*/
			delay: [{ delay: [
				isNumber,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Animation
			* @see https://tailwindcss.com/docs/animation
			*/
			animate: [{ animate: [
				"none",
				themeAnimate,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Backface Visibility
			* @see https://tailwindcss.com/docs/backface-visibility
			*/
			backface: [{ backface: ["hidden", "visible"] }],
			/**
			* Perspective
			* @see https://tailwindcss.com/docs/perspective
			*/
			perspective: [{ perspective: [
				themePerspective,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Perspective Origin
			* @see https://tailwindcss.com/docs/perspective-origin
			*/
			"perspective-origin": [{ "perspective-origin": scalePositionWithArbitrary() }],
			/**
			* Rotate
			* @see https://tailwindcss.com/docs/rotate
			*/
			rotate: [{ rotate: scaleRotate() }],
			/**
			* Rotate X
			* @see https://tailwindcss.com/docs/rotate
			*/
			"rotate-x": [{ "rotate-x": scaleRotate() }],
			/**
			* Rotate Y
			* @see https://tailwindcss.com/docs/rotate
			*/
			"rotate-y": [{ "rotate-y": scaleRotate() }],
			/**
			* Rotate Z
			* @see https://tailwindcss.com/docs/rotate
			*/
			"rotate-z": [{ "rotate-z": scaleRotate() }],
			/**
			* Scale
			* @see https://tailwindcss.com/docs/scale
			*/
			scale: [{ scale: scaleScale() }],
			/**
			* Scale X
			* @see https://tailwindcss.com/docs/scale
			*/
			"scale-x": [{ "scale-x": scaleScale() }],
			/**
			* Scale Y
			* @see https://tailwindcss.com/docs/scale
			*/
			"scale-y": [{ "scale-y": scaleScale() }],
			/**
			* Scale Z
			* @see https://tailwindcss.com/docs/scale
			*/
			"scale-z": [{ "scale-z": scaleScale() }],
			/**
			* Scale 3D
			* @see https://tailwindcss.com/docs/scale
			*/
			"scale-3d": ["scale-3d"],
			/**
			* Skew
			* @see https://tailwindcss.com/docs/skew
			*/
			skew: [{ skew: scaleSkew() }],
			/**
			* Skew X
			* @see https://tailwindcss.com/docs/skew
			*/
			"skew-x": [{ "skew-x": scaleSkew() }],
			/**
			* Skew Y
			* @see https://tailwindcss.com/docs/skew
			*/
			"skew-y": [{ "skew-y": scaleSkew() }],
			/**
			* Transform
			* @see https://tailwindcss.com/docs/transform
			*/
			transform: [{ transform: [
				isArbitraryVariable,
				isArbitraryValue,
				"",
				"none",
				"gpu",
				"cpu"
			] }],
			/**
			* Transform Origin
			* @see https://tailwindcss.com/docs/transform-origin
			*/
			"transform-origin": [{ origin: scalePositionWithArbitrary() }],
			/**
			* Transform Style
			* @see https://tailwindcss.com/docs/transform-style
			*/
			"transform-style": [{ transform: ["3d", "flat"] }],
			/**
			* Translate
			* @see https://tailwindcss.com/docs/translate
			*/
			translate: [{ translate: scaleTranslate() }],
			/**
			* Translate X
			* @see https://tailwindcss.com/docs/translate
			*/
			"translate-x": [{ "translate-x": scaleTranslate() }],
			/**
			* Translate Y
			* @see https://tailwindcss.com/docs/translate
			*/
			"translate-y": [{ "translate-y": scaleTranslate() }],
			/**
			* Translate Z
			* @see https://tailwindcss.com/docs/translate
			*/
			"translate-z": [{ "translate-z": scaleTranslate() }],
			/**
			* Translate None
			* @see https://tailwindcss.com/docs/translate
			*/
			"translate-none": ["translate-none"],
			/**
			* Zoom
			* @see https://tailwindcss.com/docs/zoom
			*/
			zoom: [{ zoom: [
				isInteger,
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Accent Color
			* @see https://tailwindcss.com/docs/accent-color
			*/
			accent: [{ accent: scaleColor() }],
			/**
			* Appearance
			* @see https://tailwindcss.com/docs/appearance
			*/
			appearance: [{ appearance: ["none", "auto"] }],
			/**
			* Caret Color
			* @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
			*/
			"caret-color": [{ caret: scaleColor() }],
			/**
			* Color Scheme
			* @see https://tailwindcss.com/docs/color-scheme
			*/
			"color-scheme": [{ scheme: [
				"normal",
				"dark",
				"light",
				"light-dark",
				"only-dark",
				"only-light"
			] }],
			/**
			* Cursor
			* @see https://tailwindcss.com/docs/cursor
			*/
			cursor: [{ cursor: [
				"auto",
				"default",
				"pointer",
				"wait",
				"text",
				"move",
				"help",
				"not-allowed",
				"none",
				"context-menu",
				"progress",
				"cell",
				"crosshair",
				"vertical-text",
				"alias",
				"copy",
				"no-drop",
				"grab",
				"grabbing",
				"all-scroll",
				"col-resize",
				"row-resize",
				"n-resize",
				"e-resize",
				"s-resize",
				"w-resize",
				"ne-resize",
				"nw-resize",
				"se-resize",
				"sw-resize",
				"ew-resize",
				"ns-resize",
				"nesw-resize",
				"nwse-resize",
				"zoom-in",
				"zoom-out",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Field Sizing
			* @see https://tailwindcss.com/docs/field-sizing
			*/
			"field-sizing": [{ "field-sizing": ["fixed", "content"] }],
			/**
			* Pointer Events
			* @see https://tailwindcss.com/docs/pointer-events
			*/
			"pointer-events": [{ "pointer-events": ["auto", "none"] }],
			/**
			* Resize
			* @see https://tailwindcss.com/docs/resize
			*/
			resize: [{ resize: [
				"none",
				"",
				"y",
				"x"
			] }],
			/**
			* Scroll Behavior
			* @see https://tailwindcss.com/docs/scroll-behavior
			*/
			"scroll-behavior": [{ scroll: ["auto", "smooth"] }],
			/**
			* Scrollbar Thumb Color
			* @see https://tailwindcss.com/docs/scrollbar-color
			*/
			"scrollbar-thumb-color": [{ "scrollbar-thumb": scaleColor() }],
			/**
			* Scrollbar Track Color
			* @see https://tailwindcss.com/docs/scrollbar-color
			*/
			"scrollbar-track-color": [{ "scrollbar-track": scaleColor() }],
			/**
			* Scrollbar Gutter
			* @see https://tailwindcss.com/docs/scrollbar-gutter
			*/
			"scrollbar-gutter": [{ "scrollbar-gutter": [
				"auto",
				"stable",
				"both"
			] }],
			/**
			* Scrollbar Width
			* @see https://tailwindcss.com/docs/scrollbar-width
			*/
			"scrollbar-w": [{ scrollbar: [
				"auto",
				"thin",
				"none"
			] }],
			/**
			* Scroll Margin
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-m": [{ "scroll-m": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Inline
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mx": [{ "scroll-mx": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Block
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-my": [{ "scroll-my": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Inline Start
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-ms": [{ "scroll-ms": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Inline End
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-me": [{ "scroll-me": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Block Start
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mbs": [{ "scroll-mbs": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Block End
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mbe": [{ "scroll-mbe": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Top
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mt": [{ "scroll-mt": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Right
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mr": [{ "scroll-mr": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Bottom
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-mb": [{ "scroll-mb": scaleUnambiguousSpacing() }],
			/**
			* Scroll Margin Left
			* @see https://tailwindcss.com/docs/scroll-margin
			*/
			"scroll-ml": [{ "scroll-ml": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-p": [{ "scroll-p": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Inline
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-px": [{ "scroll-px": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Block
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-py": [{ "scroll-py": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Inline Start
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-ps": [{ "scroll-ps": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Inline End
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pe": [{ "scroll-pe": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Block Start
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pbs": [{ "scroll-pbs": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Block End
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pbe": [{ "scroll-pbe": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Top
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pt": [{ "scroll-pt": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Right
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pr": [{ "scroll-pr": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Bottom
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pb": [{ "scroll-pb": scaleUnambiguousSpacing() }],
			/**
			* Scroll Padding Left
			* @see https://tailwindcss.com/docs/scroll-padding
			*/
			"scroll-pl": [{ "scroll-pl": scaleUnambiguousSpacing() }],
			/**
			* Scroll Snap Align
			* @see https://tailwindcss.com/docs/scroll-snap-align
			*/
			"snap-align": [{ snap: [
				"start",
				"end",
				"center",
				"align-none"
			] }],
			/**
			* Scroll Snap Stop
			* @see https://tailwindcss.com/docs/scroll-snap-stop
			*/
			"snap-stop": [{ snap: ["normal", "always"] }],
			/**
			* Scroll Snap Type
			* @see https://tailwindcss.com/docs/scroll-snap-type
			*/
			"snap-type": [{ snap: [
				"none",
				"x",
				"y",
				"both"
			] }],
			/**
			* Scroll Snap Type Strictness
			* @see https://tailwindcss.com/docs/scroll-snap-type
			*/
			"snap-strictness": [{ snap: ["mandatory", "proximity"] }],
			/**
			* Touch Action
			* @see https://tailwindcss.com/docs/touch-action
			*/
			touch: [{ touch: [
				"auto",
				"none",
				"manipulation"
			] }],
			/**
			* Touch Action X
			* @see https://tailwindcss.com/docs/touch-action
			*/
			"touch-x": [{ "touch-pan": [
				"x",
				"left",
				"right"
			] }],
			/**
			* Touch Action Y
			* @see https://tailwindcss.com/docs/touch-action
			*/
			"touch-y": [{ "touch-pan": [
				"y",
				"up",
				"down"
			] }],
			/**
			* Touch Action Pinch Zoom
			* @see https://tailwindcss.com/docs/touch-action
			*/
			"touch-pz": ["touch-pinch-zoom"],
			/**
			* User Select
			* @see https://tailwindcss.com/docs/user-select
			*/
			select: [{ select: [
				"none",
				"text",
				"all",
				"auto"
			] }],
			/**
			* Will Change
			* @see https://tailwindcss.com/docs/will-change
			*/
			"will-change": [{ "will-change": [
				"auto",
				"scroll",
				"contents",
				"transform",
				isArbitraryVariable,
				isArbitraryValue
			] }],
			/**
			* Fill
			* @see https://tailwindcss.com/docs/fill
			*/
			fill: [{ fill: ["none", ...scaleColor()] }],
			/**
			* Stroke Width
			* @see https://tailwindcss.com/docs/stroke-width
			*/
			"stroke-w": [{ stroke: [
				isNumber,
				isArbitraryVariableLength,
				isArbitraryLength,
				isArbitraryNumber
			] }],
			/**
			* Stroke
			* @see https://tailwindcss.com/docs/stroke
			*/
			stroke: [{ stroke: ["none", ...scaleColor()] }],
			/**
			* Forced Color Adjust
			* @see https://tailwindcss.com/docs/forced-color-adjust
			*/
			"forced-color-adjust": [{ "forced-color-adjust": ["auto", "none"] }]
		},
		conflictingClassGroups: {
			"container-named": ["container-type"],
			overflow: ["overflow-x", "overflow-y"],
			overscroll: ["overscroll-x", "overscroll-y"],
			inset: [
				"inset-x",
				"inset-y",
				"inset-bs",
				"inset-be",
				"start",
				"end",
				"top",
				"right",
				"bottom",
				"left"
			],
			"inset-x": ["right", "left"],
			"inset-y": ["top", "bottom"],
			flex: [
				"basis",
				"grow",
				"shrink"
			],
			gap: ["gap-x", "gap-y"],
			p: [
				"px",
				"py",
				"ps",
				"pe",
				"pbs",
				"pbe",
				"pt",
				"pr",
				"pb",
				"pl"
			],
			px: ["pr", "pl"],
			py: ["pt", "pb"],
			m: [
				"mx",
				"my",
				"ms",
				"me",
				"mbs",
				"mbe",
				"mt",
				"mr",
				"mb",
				"ml"
			],
			mx: ["mr", "ml"],
			my: ["mt", "mb"],
			size: ["w", "h"],
			"font-size": ["leading"],
			"fvn-normal": [
				"fvn-ordinal",
				"fvn-slashed-zero",
				"fvn-figure",
				"fvn-spacing",
				"fvn-fraction"
			],
			"fvn-ordinal": ["fvn-normal"],
			"fvn-slashed-zero": ["fvn-normal"],
			"fvn-figure": ["fvn-normal"],
			"fvn-spacing": ["fvn-normal"],
			"fvn-fraction": ["fvn-normal"],
			"line-clamp": ["display", "overflow"],
			rounded: [
				"rounded-s",
				"rounded-e",
				"rounded-t",
				"rounded-r",
				"rounded-b",
				"rounded-l",
				"rounded-ss",
				"rounded-se",
				"rounded-ee",
				"rounded-es",
				"rounded-tl",
				"rounded-tr",
				"rounded-br",
				"rounded-bl"
			],
			"rounded-s": ["rounded-ss", "rounded-es"],
			"rounded-e": ["rounded-se", "rounded-ee"],
			"rounded-t": ["rounded-tl", "rounded-tr"],
			"rounded-r": ["rounded-tr", "rounded-br"],
			"rounded-b": ["rounded-br", "rounded-bl"],
			"rounded-l": ["rounded-tl", "rounded-bl"],
			"border-spacing": ["border-spacing-x", "border-spacing-y"],
			"border-w": [
				"border-w-x",
				"border-w-y",
				"border-w-s",
				"border-w-e",
				"border-w-bs",
				"border-w-be",
				"border-w-t",
				"border-w-r",
				"border-w-b",
				"border-w-l"
			],
			"border-w-x": ["border-w-r", "border-w-l"],
			"border-w-y": ["border-w-t", "border-w-b"],
			"border-color": [
				"border-color-x",
				"border-color-y",
				"border-color-s",
				"border-color-e",
				"border-color-bs",
				"border-color-be",
				"border-color-t",
				"border-color-r",
				"border-color-b",
				"border-color-l"
			],
			"border-color-x": ["border-color-r", "border-color-l"],
			"border-color-y": ["border-color-t", "border-color-b"],
			translate: [
				"translate-x",
				"translate-y",
				"translate-none"
			],
			"translate-none": [
				"translate",
				"translate-x",
				"translate-y",
				"translate-z"
			],
			"scroll-m": [
				"scroll-mx",
				"scroll-my",
				"scroll-ms",
				"scroll-me",
				"scroll-mbs",
				"scroll-mbe",
				"scroll-mt",
				"scroll-mr",
				"scroll-mb",
				"scroll-ml"
			],
			"scroll-mx": ["scroll-mr", "scroll-ml"],
			"scroll-my": ["scroll-mt", "scroll-mb"],
			"scroll-p": [
				"scroll-px",
				"scroll-py",
				"scroll-ps",
				"scroll-pe",
				"scroll-pbs",
				"scroll-pbe",
				"scroll-pt",
				"scroll-pr",
				"scroll-pb",
				"scroll-pl"
			],
			"scroll-px": ["scroll-pr", "scroll-pl"],
			"scroll-py": ["scroll-pt", "scroll-pb"],
			touch: [
				"touch-x",
				"touch-y",
				"touch-pz"
			],
			"touch-x": ["touch"],
			"touch-y": ["touch"],
			"touch-pz": ["touch"]
		},
		conflictingClassGroupModifiers: { "font-size": ["leading"] },
		postfixLookupClassGroups: ["container-type"],
		orderSensitiveModifiers: [
			"*",
			"**",
			"after",
			"backdrop",
			"before",
			"details-content",
			"file",
			"first-letter",
			"first-line",
			"marker",
			"placeholder",
			"selection"
		]
	};
};
var twMerge = /*#__PURE__*/ createTailwindMerge(getDefaultConfig);
//#endregion
//#region node_modules/trough/lib/index.js
/**
* @typedef {(error?: Error | null | undefined, ...output: Array<any>) => void} Callback
*   Callback.
*
* @typedef {(...input: Array<any>) => any} Middleware
*   Ware.
*
* @typedef Pipeline
*   Pipeline.
* @property {Run} run
*   Run the pipeline.
* @property {Use} use
*   Add middleware.
*
* @typedef {(...input: Array<any>) => void} Run
*   Call all middleware.
*
*   Calls `done` on completion with either an error or the output of the
*   last middleware.
*
*   > 👉 **Note**: as the length of input defines whether async functions get a
*   > `next` function,
*   > it’s recommended to keep `input` at one value normally.

*
* @typedef {(fn: Middleware) => Pipeline} Use
*   Add middleware.
*/
/**
* Create new middleware.
*
* @returns {Pipeline}
*   Pipeline.
*/
function trough() {
	/** @type {Array<Middleware>} */
	const fns = [];
	/** @type {Pipeline} */
	const pipeline = {
		run,
		use
	};
	return pipeline;
	/** @type {Run} */
	function run(...values) {
		let middlewareIndex = -1;
		/** @type {Callback} */
		const callback = values.pop();
		if (typeof callback !== "function") throw new TypeError("Expected function as last argument, not " + callback);
		next(null, ...values);
		/**
		* Run the next `fn`, or we’re done.
		*
		* @param {Error | null | undefined} error
		* @param {Array<any>} output
		*/
		function next(error, ...output) {
			const fn = fns[++middlewareIndex];
			let index = -1;
			if (error) {
				callback(error);
				return;
			}
			while (++index < values.length) if (output[index] === null || output[index] === void 0) output[index] = values[index];
			values = output;
			if (fn) wrap(fn, next)(...output);
			else callback(null, ...output);
		}
	}
	/** @type {Use} */
	function use(middelware) {
		if (typeof middelware !== "function") throw new TypeError("Expected `middelware` to be a function, not " + middelware);
		fns.push(middelware);
		return pipeline;
	}
}
/**
* Wrap `middleware` into a uniform interface.
*
* You can pass all input to the resulting function.
* `callback` is then called with the output of `middleware`.
*
* If `middleware` accepts more arguments than the later given in input,
* an extra `done` function is passed to it after that input,
* which must be called by `middleware`.
*
* The first value in `input` is the main input value.
* All other input values are the rest input values.
* The values given to `callback` are the input values,
* merged with every non-nullish output value.
*
* * if `middleware` throws an error,
*   returns a promise that is rejected,
*   or calls the given `done` function with an error,
*   `callback` is called with that error
* * if `middleware` returns a value or returns a promise that is resolved,
*   that value is the main output value
* * if `middleware` calls `done`,
*   all non-nullish values except for the first one (the error) overwrite the
*   output values
*
* @param {Middleware} middleware
*   Function to wrap.
* @param {Callback} callback
*   Callback called with the output of `middleware`.
* @returns {Run}
*   Wrapped middleware.
*/
function wrap(middleware, callback) {
	/** @type {boolean} */
	let called;
	return wrapped;
	/**
	* Call `middleware`.
	* @this {any}
	* @param {Array<any>} parameters
	* @returns {void}
	*/
	function wrapped(...parameters) {
		const fnExpectsCallback = middleware.length > parameters.length;
		/** @type {any} */
		let result;
		if (fnExpectsCallback) parameters.push(done);
		try {
			result = middleware.apply(this, parameters);
		} catch (error) {
			const exception = error;
			if (fnExpectsCallback && called) throw exception;
			return done(exception);
		}
		if (!fnExpectsCallback) if (result && result.then && typeof result.then === "function") result.then(then, done);
		else if (result instanceof Error) done(result);
		else then(result);
	}
	/**
	* Call `callback`, only once.
	*
	* @type {Callback}
	*/
	function done(error, ...output) {
		if (!called) {
			called = true;
			callback(error, ...output);
		}
	}
	/**
	* Call `done` with one value.
	*
	* @param {any} [value]
	*/
	function then(value) {
		done(null, value);
	}
}
//#endregion
//#region node_modules/unified/lib/callable-instance.js
var import_extend = /* @__PURE__ */ __toESM(require_extend(), 1);
var CallableInstance = (
/**
* @this {Function}
* @param {string | symbol} property
* @returns {(...parameters: Array<unknown>) => unknown}
*/
function(property) {
	const proto = this.constructor.prototype;
	const value = proto[property];
	/** @type {(...parameters: Array<unknown>) => unknown} */
	const apply = function() {
		return value.apply(apply, arguments);
	};
	Object.setPrototypeOf(apply, proto);
	return apply;
});
//#endregion
//#region node_modules/unified/lib/index.js
/**
* @typedef {import('trough').Pipeline} Pipeline
*
* @typedef {import('unist').Node} Node
*
* @typedef {import('vfile').Compatible} Compatible
* @typedef {import('vfile').Value} Value
*
* @typedef {import('../index.js').CompileResultMap} CompileResultMap
* @typedef {import('../index.js').Data} Data
* @typedef {import('../index.js').Settings} Settings
*/
/**
* @typedef {CompileResultMap[keyof CompileResultMap]} CompileResults
*   Acceptable results from compilers.
*
*   To register custom results, add them to
*   {@linkcode CompileResultMap}.
*/
/**
* @template {Node} [Tree=Node]
*   The node that the compiler receives (default: `Node`).
* @template {CompileResults} [Result=CompileResults]
*   The thing that the compiler yields (default: `CompileResults`).
* @callback Compiler
*   A **compiler** handles the compiling of a syntax tree to something else
*   (in most cases, text) (TypeScript type).
*
*   It is used in the stringify phase and called with a {@linkcode Node}
*   and {@linkcode VFile} representation of the document to compile.
*   It should return the textual representation of the given tree (typically
*   `string`).
*
*   > **Note**: unified typically compiles by serializing: most compilers
*   > return `string` (or `Uint8Array`).
*   > Some compilers, such as the one configured with
*   > [`rehype-react`][rehype-react], return other values (in this case, a
*   > React tree).
*   > If you’re using a compiler that doesn’t serialize, expect different
*   > result values.
*   >
*   > To register custom results in TypeScript, add them to
*   > {@linkcode CompileResultMap}.
*
*   [rehype-react]: https://github.com/rehypejs/rehype-react
* @param {Tree} tree
*   Tree to compile.
* @param {VFile} file
*   File associated with `tree`.
* @returns {Result}
*   New content: compiled text (`string` or `Uint8Array`, for `file.value`) or
*   something else (for `file.result`).
*/
/**
* @template {Node} [Tree=Node]
*   The node that the parser yields (default: `Node`)
* @callback Parser
*   A **parser** handles the parsing of text to a syntax tree.
*
*   It is used in the parse phase and is called with a `string` and
*   {@linkcode VFile} of the document to parse.
*   It must return the syntax tree representation of the given file
*   ({@linkcode Node}).
* @param {string} document
*   Document to parse.
* @param {VFile} file
*   File associated with `document`.
* @returns {Tree}
*   Node representing the given file.
*/
/**
* @typedef {(
*   Plugin<Array<any>, any, any> |
*   PluginTuple<Array<any>, any, any> |
*   Preset
* )} Pluggable
*   Union of the different ways to add plugins and settings.
*/
/**
* @typedef {Array<Pluggable>} PluggableList
*   List of plugins and presets.
*/
/**
* @template {Array<unknown>} [PluginParameters=[]]
*   Arguments passed to the plugin (default: `[]`, the empty tuple).
* @template {Node | string | undefined} [Input=Node]
*   Value that is expected as input (default: `Node`).
*
*   *   If the plugin returns a {@linkcode Transformer}, this
*       should be the node it expects.
*   *   If the plugin sets a {@linkcode Parser}, this should be
*       `string`.
*   *   If the plugin sets a {@linkcode Compiler}, this should be the
*       node it expects.
* @template [Output=Input]
*   Value that is yielded as output (default: `Input`).
*
*   *   If the plugin returns a {@linkcode Transformer}, this
*       should be the node that that yields.
*   *   If the plugin sets a {@linkcode Parser}, this should be the
*       node that it yields.
*   *   If the plugin sets a {@linkcode Compiler}, this should be
*       result it yields.
* @typedef {(
*   (this: Processor, ...parameters: PluginParameters) =>
*     Input extends string ? // Parser.
*        Output extends Node | undefined ? undefined | void : never :
*     Output extends CompileResults ? // Compiler.
*        Input extends Node | undefined ? undefined | void : never :
*     Transformer<
*       Input extends Node ? Input : Node,
*       Output extends Node ? Output : Node
*     > | undefined | void
* )} Plugin
*   Single plugin.
*
*   Plugins configure the processors they are applied on in the following
*   ways:
*
*   *   they change the processor, such as the parser, the compiler, or by
*       configuring data
*   *   they specify how to handle trees and files
*
*   In practice, they are functions that can receive options and configure the
*   processor (`this`).
*
*   > **Note**: plugins are called when the processor is *frozen*, not when
*   > they are applied.
*/
/**
* Tuple of a plugin and its configuration.
*
* The first item is a plugin, the rest are its parameters.
*
* @template {Array<unknown>} [TupleParameters=[]]
*   Arguments passed to the plugin (default: `[]`, the empty tuple).
* @template {Node | string | undefined} [Input=undefined]
*   Value that is expected as input (optional).
*
*   *   If the plugin returns a {@linkcode Transformer}, this
*       should be the node it expects.
*   *   If the plugin sets a {@linkcode Parser}, this should be
*       `string`.
*   *   If the plugin sets a {@linkcode Compiler}, this should be the
*       node it expects.
* @template [Output=undefined] (optional).
*   Value that is yielded as output.
*
*   *   If the plugin returns a {@linkcode Transformer}, this
*       should be the node that that yields.
*   *   If the plugin sets a {@linkcode Parser}, this should be the
*       node that it yields.
*   *   If the plugin sets a {@linkcode Compiler}, this should be
*       result it yields.
* @typedef {(
*   [
*     plugin: Plugin<TupleParameters, Input, Output>,
*     ...parameters: TupleParameters
*   ]
* )} PluginTuple
*/
/**
* @typedef Preset
*   Sharable configuration.
*
*   They can contain plugins and settings.
* @property {PluggableList | undefined} [plugins]
*   List of plugins and presets (optional).
* @property {Settings | undefined} [settings]
*   Shared settings for parsers and compilers (optional).
*/
/**
* @template {VFile} [File=VFile]
*   The file that the callback receives (default: `VFile`).
* @callback ProcessCallback
*   Callback called when the process is done.
*
*   Called with either an error or a result.
* @param {Error | undefined} [error]
*   Fatal error (optional).
* @param {File | undefined} [file]
*   Processed file (optional).
* @returns {undefined}
*   Nothing.
*/
/**
* @template {Node} [Tree=Node]
*   The tree that the callback receives (default: `Node`).
* @callback RunCallback
*   Callback called when transformers are done.
*
*   Called with either an error or results.
* @param {Error | undefined} [error]
*   Fatal error (optional).
* @param {Tree | undefined} [tree]
*   Transformed tree (optional).
* @param {VFile | undefined} [file]
*   File (optional).
* @returns {undefined}
*   Nothing.
*/
/**
* @template {Node} [Output=Node]
*   Node type that the transformer yields (default: `Node`).
* @callback TransformCallback
*   Callback passed to transforms.
*
*   If the signature of a `transformer` accepts a third argument, the
*   transformer may perform asynchronous operations, and must call it.
* @param {Error | undefined} [error]
*   Fatal error to stop the process (optional).
* @param {Output | undefined} [tree]
*   New, changed, tree (optional).
* @param {VFile | undefined} [file]
*   New, changed, file (optional).
* @returns {undefined}
*   Nothing.
*/
/**
* @template {Node} [Input=Node]
*   Node type that the transformer expects (default: `Node`).
* @template {Node} [Output=Input]
*   Node type that the transformer yields (default: `Input`).
* @callback Transformer
*   Transformers handle syntax trees and files.
*
*   They are functions that are called each time a syntax tree and file are
*   passed through the run phase.
*   When an error occurs in them (either because it’s thrown, returned,
*   rejected, or passed to `next`), the process stops.
*
*   The run phase is handled by [`trough`][trough], see its documentation for
*   the exact semantics of these functions.
*
*   > **Note**: you should likely ignore `next`: don’t accept it.
*   > it supports callback-style async work.
*   > But promises are likely easier to reason about.
*
*   [trough]: https://github.com/wooorm/trough#function-fninput-next
* @param {Input} tree
*   Tree to handle.
* @param {VFile} file
*   File to handle.
* @param {TransformCallback<Output>} next
*   Callback.
* @returns {(
*   Promise<Output | undefined | void> |
*   Promise<never> | // For some reason this is needed separately.
*   Output |
*   Error |
*   undefined |
*   void
* )}
*   If you accept `next`, nothing.
*   Otherwise:
*
*   *   `Error` — fatal error to stop the process
*   *   `Promise<undefined>` or `undefined` — the next transformer keeps using
*       same tree
*   *   `Promise<Node>` or `Node` — new, changed, tree
*/
/**
* @template {Node | undefined} ParseTree
*   Output of `parse`.
* @template {Node | undefined} HeadTree
*   Input for `run`.
* @template {Node | undefined} TailTree
*   Output for `run`.
* @template {Node | undefined} CompileTree
*   Input of `stringify`.
* @template {CompileResults | undefined} CompileResult
*   Output of `stringify`.
* @template {Node | string | undefined} Input
*   Input of plugin.
* @template Output
*   Output of plugin (optional).
* @typedef {(
*   Input extends string
*     ? Output extends Node | undefined
*       ? // Parser.
*         Processor<
*           Output extends undefined ? ParseTree : Output,
*           HeadTree,
*           TailTree,
*           CompileTree,
*           CompileResult
*         >
*       : // Unknown.
*         Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>
*     : Output extends CompileResults
*     ? Input extends Node | undefined
*       ? // Compiler.
*         Processor<
*           ParseTree,
*           HeadTree,
*           TailTree,
*           Input extends undefined ? CompileTree : Input,
*           Output extends undefined ? CompileResult : Output
*         >
*       : // Unknown.
*         Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>
*     : Input extends Node | undefined
*     ? Output extends Node | undefined
*       ? // Transform.
*         Processor<
*           ParseTree,
*           HeadTree extends undefined ? Input : HeadTree,
*           Output extends undefined ? TailTree : Output,
*           CompileTree,
*           CompileResult
*         >
*       : // Unknown.
*         Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>
*     : // Unknown.
*       Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>
* )} UsePlugin
*   Create a processor based on the input/output of a {@link Plugin plugin}.
*/
/**
* @template {CompileResults | undefined} Result
*   Node type that the transformer yields.
* @typedef {(
*   Result extends Value | undefined ?
*     VFile :
*     VFile & {result: Result}
*   )} VFileWithOutput
*   Type to generate a {@linkcode VFile} corresponding to a compiler result.
*
*   If a result that is not acceptable on a `VFile` is used, that will
*   be stored on the `result` field of {@linkcode VFile}.
*/
var own = {}.hasOwnProperty;
/**
* Create a new processor.
*
* @example
*   This example shows how a new processor can be created (from `remark`) and linked
*   to **stdin**(4) and **stdout**(4).
*
*   ```js
*   import process from 'node:process'
*   import concatStream from 'concat-stream'
*   import {remark} from 'remark'
*
*   process.stdin.pipe(
*     concatStream(function (buf) {
*       process.stdout.write(String(remark().processSync(buf)))
*     })
*   )
*   ```
*
* @returns
*   New *unfrozen* processor (`processor`).
*
*   This processor is configured to work the same as its ancestor.
*   When the descendant processor is configured in the future it does not
*   affect the ancestral processor.
*/
var unified = new class Processor extends CallableInstance {
	/**
	* Create a processor.
	*/
	constructor() {
		super("copy");
		/**
		* Compiler to use (deprecated).
		*
		* @deprecated
		*   Use `compiler` instead.
		* @type {(
		*   Compiler<
		*     CompileTree extends undefined ? Node : CompileTree,
		*     CompileResult extends undefined ? CompileResults : CompileResult
		*   > |
		*   undefined
		* )}
		*/
		this.Compiler = void 0;
		/**
		* Parser to use (deprecated).
		*
		* @deprecated
		*   Use `parser` instead.
		* @type {(
		*   Parser<ParseTree extends undefined ? Node : ParseTree> |
		*   undefined
		* )}
		*/
		this.Parser = void 0;
		/**
		* Internal list of configured plugins.
		*
		* @deprecated
		*   This is a private internal property and should not be used.
		* @type {Array<PluginTuple<Array<unknown>>>}
		*/
		this.attachers = [];
		/**
		* Compiler to use.
		*
		* @type {(
		*   Compiler<
		*     CompileTree extends undefined ? Node : CompileTree,
		*     CompileResult extends undefined ? CompileResults : CompileResult
		*   > |
		*   undefined
		* )}
		*/
		this.compiler = void 0;
		/**
		* Internal state to track where we are while freezing.
		*
		* @deprecated
		*   This is a private internal property and should not be used.
		* @type {number}
		*/
		this.freezeIndex = -1;
		/**
		* Internal state to track whether we’re frozen.
		*
		* @deprecated
		*   This is a private internal property and should not be used.
		* @type {boolean | undefined}
		*/
		this.frozen = void 0;
		/**
		* Internal state.
		*
		* @deprecated
		*   This is a private internal property and should not be used.
		* @type {Data}
		*/
		this.namespace = {};
		/**
		* Parser to use.
		*
		* @type {(
		*   Parser<ParseTree extends undefined ? Node : ParseTree> |
		*   undefined
		* )}
		*/
		this.parser = void 0;
		/**
		* Internal list of configured transformers.
		*
		* @deprecated
		*   This is a private internal property and should not be used.
		* @type {Pipeline}
		*/
		this.transformers = trough();
	}
	/**
	* Copy a processor.
	*
	* @deprecated
	*   This is a private internal method and should not be used.
	* @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
	*   New *unfrozen* processor ({@linkcode Processor}) that is
	*   configured to work the same as its ancestor.
	*   When the descendant processor is configured in the future it does not
	*   affect the ancestral processor.
	*/
	copy() {
		const destination = new Processor();
		let index = -1;
		while (++index < this.attachers.length) {
			const attacher = this.attachers[index];
			destination.use(...attacher);
		}
		destination.data((0, import_extend.default)(true, {}, this.namespace));
		return destination;
	}
	/**
	* Configure the processor with info available to all plugins.
	* Information is stored in an object.
	*
	* Typically, options can be given to a specific plugin, but sometimes it
	* makes sense to have information shared with several plugins.
	* For example, a list of HTML elements that are self-closing, which is
	* needed during all phases.
	*
	* > **Note**: setting information cannot occur on *frozen* processors.
	* > Call the processor first to create a new unfrozen processor.
	*
	* > **Note**: to register custom data in TypeScript, augment the
	* > {@linkcode Data} interface.
	*
	* @example
	*   This example show how to get and set info:
	*
	*   ```js
	*   import {unified} from 'unified'
	*
	*   const processor = unified().data('alpha', 'bravo')
	*
	*   processor.data('alpha') // => 'bravo'
	*
	*   processor.data() // => {alpha: 'bravo'}
	*
	*   processor.data({charlie: 'delta'})
	*
	*   processor.data() // => {charlie: 'delta'}
	*   ```
	*
	* @template {keyof Data} Key
	*
	* @overload
	* @returns {Data}
	*
	* @overload
	* @param {Data} dataset
	* @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
	*
	* @overload
	* @param {Key} key
	* @returns {Data[Key]}
	*
	* @overload
	* @param {Key} key
	* @param {Data[Key]} value
	* @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
	*
	* @param {Data | Key} [key]
	*   Key to get or set, or entire dataset to set, or nothing to get the
	*   entire dataset (optional).
	* @param {Data[Key]} [value]
	*   Value to set (optional).
	* @returns {unknown}
	*   The current processor when setting, the value at `key` when getting, or
	*   the entire dataset when getting without key.
	*/
	data(key, value) {
		if (typeof key === "string") {
			if (arguments.length === 2) {
				assertUnfrozen("data", this.frozen);
				this.namespace[key] = value;
				return this;
			}
			return own.call(this.namespace, key) && this.namespace[key] || void 0;
		}
		if (key) {
			assertUnfrozen("data", this.frozen);
			this.namespace = key;
			return this;
		}
		return this.namespace;
	}
	/**
	* Freeze a processor.
	*
	* Frozen processors are meant to be extended and not to be configured
	* directly.
	*
	* When a processor is frozen it cannot be unfrozen.
	* New processors working the same way can be created by calling the
	* processor.
	*
	* It’s possible to freeze processors explicitly by calling `.freeze()`.
	* Processors freeze automatically when `.parse()`, `.run()`, `.runSync()`,
	* `.stringify()`, `.process()`, or `.processSync()` are called.
	*
	* @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
	*   The current processor.
	*/
	freeze() {
		if (this.frozen) return this;
		const self = this;
		while (++this.freezeIndex < this.attachers.length) {
			const [attacher, ...options] = this.attachers[this.freezeIndex];
			if (options[0] === false) continue;
			if (options[0] === true) options[0] = void 0;
			const transformer = attacher.call(self, ...options);
			if (typeof transformer === "function") this.transformers.use(transformer);
		}
		this.frozen = true;
		this.freezeIndex = Number.POSITIVE_INFINITY;
		return this;
	}
	/**
	* Parse text to a syntax tree.
	*
	* > **Note**: `parse` freezes the processor if not already *frozen*.
	*
	* > **Note**: `parse` performs the parse phase, not the run phase or other
	* > phases.
	*
	* @param {Compatible | undefined} [file]
	*   file to parse (optional); typically `string` or `VFile`; any value
	*   accepted as `x` in `new VFile(x)`.
	* @returns {ParseTree extends undefined ? Node : ParseTree}
	*   Syntax tree representing `file`.
	*/
	parse(file) {
		this.freeze();
		const realFile = vfile(file);
		const parser = this.parser || this.Parser;
		assertParser("parse", parser);
		return parser(String(realFile), realFile);
	}
	/**
	* Process the given file as configured on the processor.
	*
	* > **Note**: `process` freezes the processor if not already *frozen*.
	*
	* > **Note**: `process` performs the parse, run, and stringify phases.
	*
	* @overload
	* @param {Compatible | undefined} file
	* @param {ProcessCallback<VFileWithOutput<CompileResult>>} done
	* @returns {undefined}
	*
	* @overload
	* @param {Compatible | undefined} [file]
	* @returns {Promise<VFileWithOutput<CompileResult>>}
	*
	* @param {Compatible | undefined} [file]
	*   File (optional); typically `string` or `VFile`]; any value accepted as
	*   `x` in `new VFile(x)`.
	* @param {ProcessCallback<VFileWithOutput<CompileResult>> | undefined} [done]
	*   Callback (optional).
	* @returns {Promise<VFile> | undefined}
	*   Nothing if `done` is given.
	*   Otherwise a promise, rejected with a fatal error or resolved with the
	*   processed file.
	*
	*   The parsed, transformed, and compiled value is available at
	*   `file.value` (see note).
	*
	*   > **Note**: unified typically compiles by serializing: most
	*   > compilers return `string` (or `Uint8Array`).
	*   > Some compilers, such as the one configured with
	*   > [`rehype-react`][rehype-react], return other values (in this case, a
	*   > React tree).
	*   > If you’re using a compiler that doesn’t serialize, expect different
	*   > result values.
	*   >
	*   > To register custom results in TypeScript, add them to
	*   > {@linkcode CompileResultMap}.
	*
	*   [rehype-react]: https://github.com/rehypejs/rehype-react
	*/
	process(file, done) {
		const self = this;
		this.freeze();
		assertParser("process", this.parser || this.Parser);
		assertCompiler("process", this.compiler || this.Compiler);
		return done ? executor(void 0, done) : new Promise(executor);
		/**
		* @param {((file: VFileWithOutput<CompileResult>) => undefined | void) | undefined} resolve
		* @param {(error: Error | undefined) => undefined | void} reject
		* @returns {undefined}
		*/
		function executor(resolve, reject) {
			const realFile = vfile(file);
			const parseTree = self.parse(realFile);
			self.run(parseTree, realFile, function(error, tree, file) {
				if (error || !tree || !file) return realDone(error);
				const compileTree = tree;
				const compileResult = self.stringify(compileTree, file);
				if (looksLikeAValue(compileResult)) file.value = compileResult;
				else file.result = compileResult;
				realDone(error, file);
			});
			/**
			* @param {Error | undefined} error
			* @param {VFileWithOutput<CompileResult> | undefined} [file]
			* @returns {undefined}
			*/
			function realDone(error, file) {
				if (error || !file) reject(error);
				else if (resolve) resolve(file);
				else done(void 0, file);
			}
		}
	}
	/**
	* Process the given file as configured on the processor.
	*
	* An error is thrown if asynchronous transforms are configured.
	*
	* > **Note**: `processSync` freezes the processor if not already *frozen*.
	*
	* > **Note**: `processSync` performs the parse, run, and stringify phases.
	*
	* @param {Compatible | undefined} [file]
	*   File (optional); typically `string` or `VFile`; any value accepted as
	*   `x` in `new VFile(x)`.
	* @returns {VFileWithOutput<CompileResult>}
	*   The processed file.
	*
	*   The parsed, transformed, and compiled value is available at
	*   `file.value` (see note).
	*
	*   > **Note**: unified typically compiles by serializing: most
	*   > compilers return `string` (or `Uint8Array`).
	*   > Some compilers, such as the one configured with
	*   > [`rehype-react`][rehype-react], return other values (in this case, a
	*   > React tree).
	*   > If you’re using a compiler that doesn’t serialize, expect different
	*   > result values.
	*   >
	*   > To register custom results in TypeScript, add them to
	*   > {@linkcode CompileResultMap}.
	*
	*   [rehype-react]: https://github.com/rehypejs/rehype-react
	*/
	processSync(file) {
		/** @type {boolean} */
		let complete = false;
		/** @type {VFileWithOutput<CompileResult> | undefined} */
		let result;
		this.freeze();
		assertParser("processSync", this.parser || this.Parser);
		assertCompiler("processSync", this.compiler || this.Compiler);
		this.process(file, realDone);
		assertDone("processSync", "process", complete);
		return result;
		/**
		* @type {ProcessCallback<VFileWithOutput<CompileResult>>}
		*/
		function realDone(error, file) {
			complete = true;
			bail(error);
			result = file;
		}
	}
	/**
	* Run *transformers* on a syntax tree.
	*
	* > **Note**: `run` freezes the processor if not already *frozen*.
	*
	* > **Note**: `run` performs the run phase, not other phases.
	*
	* @overload
	* @param {HeadTree extends undefined ? Node : HeadTree} tree
	* @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
	* @returns {undefined}
	*
	* @overload
	* @param {HeadTree extends undefined ? Node : HeadTree} tree
	* @param {Compatible | undefined} file
	* @param {RunCallback<TailTree extends undefined ? Node : TailTree>} done
	* @returns {undefined}
	*
	* @overload
	* @param {HeadTree extends undefined ? Node : HeadTree} tree
	* @param {Compatible | undefined} [file]
	* @returns {Promise<TailTree extends undefined ? Node : TailTree>}
	*
	* @param {HeadTree extends undefined ? Node : HeadTree} tree
	*   Tree to transform and inspect.
	* @param {(
	*   RunCallback<TailTree extends undefined ? Node : TailTree> |
	*   Compatible
	* )} [file]
	*   File associated with `node` (optional); any value accepted as `x` in
	*   `new VFile(x)`.
	* @param {RunCallback<TailTree extends undefined ? Node : TailTree>} [done]
	*   Callback (optional).
	* @returns {Promise<TailTree extends undefined ? Node : TailTree> | undefined}
	*   Nothing if `done` is given.
	*   Otherwise, a promise rejected with a fatal error or resolved with the
	*   transformed tree.
	*/
	run(tree, file, done) {
		assertNode(tree);
		this.freeze();
		const transformers = this.transformers;
		if (!done && typeof file === "function") {
			done = file;
			file = void 0;
		}
		return done ? executor(void 0, done) : new Promise(executor);
		/**
		* @param {(
		*   ((tree: TailTree extends undefined ? Node : TailTree) => undefined | void) |
		*   undefined
		* )} resolve
		* @param {(error: Error) => undefined | void} reject
		* @returns {undefined}
		*/
		function executor(resolve, reject) {
			const realFile = vfile(file);
			transformers.run(tree, realFile, realDone);
			/**
			* @param {Error | undefined} error
			* @param {Node} outputTree
			* @param {VFile} file
			* @returns {undefined}
			*/
			function realDone(error, outputTree, file) {
				const resultingTree = outputTree || tree;
				if (error) reject(error);
				else if (resolve) resolve(resultingTree);
				else done(void 0, resultingTree, file);
			}
		}
	}
	/**
	* Run *transformers* on a syntax tree.
	*
	* An error is thrown if asynchronous transforms are configured.
	*
	* > **Note**: `runSync` freezes the processor if not already *frozen*.
	*
	* > **Note**: `runSync` performs the run phase, not other phases.
	*
	* @param {HeadTree extends undefined ? Node : HeadTree} tree
	*   Tree to transform and inspect.
	* @param {Compatible | undefined} [file]
	*   File associated with `node` (optional); any value accepted as `x` in
	*   `new VFile(x)`.
	* @returns {TailTree extends undefined ? Node : TailTree}
	*   Transformed tree.
	*/
	runSync(tree, file) {
		/** @type {boolean} */
		let complete = false;
		/** @type {(TailTree extends undefined ? Node : TailTree) | undefined} */
		let result;
		this.run(tree, file, realDone);
		assertDone("runSync", "run", complete);
		return result;
		/**
		* @type {RunCallback<TailTree extends undefined ? Node : TailTree>}
		*/
		function realDone(error, tree) {
			bail(error);
			result = tree;
			complete = true;
		}
	}
	/**
	* Compile a syntax tree.
	*
	* > **Note**: `stringify` freezes the processor if not already *frozen*.
	*
	* > **Note**: `stringify` performs the stringify phase, not the run phase
	* > or other phases.
	*
	* @param {CompileTree extends undefined ? Node : CompileTree} tree
	*   Tree to compile.
	* @param {Compatible | undefined} [file]
	*   File associated with `node` (optional); any value accepted as `x` in
	*   `new VFile(x)`.
	* @returns {CompileResult extends undefined ? Value : CompileResult}
	*   Textual representation of the tree (see note).
	*
	*   > **Note**: unified typically compiles by serializing: most compilers
	*   > return `string` (or `Uint8Array`).
	*   > Some compilers, such as the one configured with
	*   > [`rehype-react`][rehype-react], return other values (in this case, a
	*   > React tree).
	*   > If you’re using a compiler that doesn’t serialize, expect different
	*   > result values.
	*   >
	*   > To register custom results in TypeScript, add them to
	*   > {@linkcode CompileResultMap}.
	*
	*   [rehype-react]: https://github.com/rehypejs/rehype-react
	*/
	stringify(tree, file) {
		this.freeze();
		const realFile = vfile(file);
		const compiler = this.compiler || this.Compiler;
		assertCompiler("stringify", compiler);
		assertNode(tree);
		return compiler(tree, realFile);
	}
	/**
	* Configure the processor to use a plugin, a list of usable values, or a
	* preset.
	*
	* If the processor is already using a plugin, the previous plugin
	* configuration is changed based on the options that are passed in.
	* In other words, the plugin is not added a second time.
	*
	* > **Note**: `use` cannot be called on *frozen* processors.
	* > Call the processor first to create a new unfrozen processor.
	*
	* @example
	*   There are many ways to pass plugins to `.use()`.
	*   This example gives an overview:
	*
	*   ```js
	*   import {unified} from 'unified'
	*
	*   unified()
	*     // Plugin with options:
	*     .use(pluginA, {x: true, y: true})
	*     // Passing the same plugin again merges configuration (to `{x: true, y: false, z: true}`):
	*     .use(pluginA, {y: false, z: true})
	*     // Plugins:
	*     .use([pluginB, pluginC])
	*     // Two plugins, the second with options:
	*     .use([pluginD, [pluginE, {}]])
	*     // Preset with plugins and settings:
	*     .use({plugins: [pluginF, [pluginG, {}]], settings: {position: false}})
	*     // Settings only:
	*     .use({settings: {position: false}})
	*   ```
	*
	* @template {Array<unknown>} [Parameters=[]]
	* @template {Node | string | undefined} [Input=undefined]
	* @template [Output=Input]
	*
	* @overload
	* @param {Preset | null | undefined} [preset]
	* @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
	*
	* @overload
	* @param {PluggableList} list
	* @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
	*
	* @overload
	* @param {Plugin<Parameters, Input, Output>} plugin
	* @param {...(Parameters | [boolean])} parameters
	* @returns {UsePlugin<ParseTree, HeadTree, TailTree, CompileTree, CompileResult, Input, Output>}
	*
	* @param {PluggableList | Plugin | Preset | null | undefined} value
	*   Usable value.
	* @param {...unknown} parameters
	*   Parameters, when a plugin is given as a usable value.
	* @returns {Processor<ParseTree, HeadTree, TailTree, CompileTree, CompileResult>}
	*   Current processor.
	*/
	use(value, ...parameters) {
		const attachers = this.attachers;
		const namespace = this.namespace;
		assertUnfrozen("use", this.frozen);
		if (value === null || value === void 0) {} else if (typeof value === "function") addPlugin(value, parameters);
		else if (typeof value === "object") if (Array.isArray(value)) addList(value);
		else addPreset(value);
		else throw new TypeError("Expected usable value, not `" + value + "`");
		return this;
		/**
		* @param {Pluggable} value
		* @returns {undefined}
		*/
		function add(value) {
			if (typeof value === "function") addPlugin(value, []);
			else if (typeof value === "object") if (Array.isArray(value)) {
				const [plugin, ...parameters] = value;
				addPlugin(plugin, parameters);
			} else addPreset(value);
			else throw new TypeError("Expected usable value, not `" + value + "`");
		}
		/**
		* @param {Preset} result
		* @returns {undefined}
		*/
		function addPreset(result) {
			if (!("plugins" in result) && !("settings" in result)) throw new Error("Expected usable value but received an empty preset, which is probably a mistake: presets typically come with `plugins` and sometimes with `settings`, but this has neither");
			addList(result.plugins);
			if (result.settings) namespace.settings = (0, import_extend.default)(true, namespace.settings, result.settings);
		}
		/**
		* @param {PluggableList | null | undefined} plugins
		* @returns {undefined}
		*/
		function addList(plugins) {
			let index = -1;
			if (plugins === null || plugins === void 0) {} else if (Array.isArray(plugins)) while (++index < plugins.length) {
				const thing = plugins[index];
				add(thing);
			}
			else throw new TypeError("Expected a list of plugins, not `" + plugins + "`");
		}
		/**
		* @param {Plugin} plugin
		* @param {Array<unknown>} parameters
		* @returns {undefined}
		*/
		function addPlugin(plugin, parameters) {
			let index = -1;
			let entryIndex = -1;
			while (++index < attachers.length) if (attachers[index][0] === plugin) {
				entryIndex = index;
				break;
			}
			if (entryIndex === -1) attachers.push([plugin, ...parameters]);
			else if (parameters.length > 0) {
				let [primary, ...rest] = parameters;
				const currentPrimary = attachers[entryIndex][1];
				if (isPlainObject(currentPrimary) && isPlainObject(primary)) primary = (0, import_extend.default)(true, currentPrimary, primary);
				attachers[entryIndex] = [
					plugin,
					primary,
					...rest
				];
			}
		}
	}
}().freeze();
/**
* Assert a parser is available.
*
* @param {string} name
* @param {unknown} value
* @returns {asserts value is Parser}
*/
function assertParser(name, value) {
	if (typeof value !== "function") throw new TypeError("Cannot `" + name + "` without `parser`");
}
/**
* Assert a compiler is available.
*
* @param {string} name
* @param {unknown} value
* @returns {asserts value is Compiler}
*/
function assertCompiler(name, value) {
	if (typeof value !== "function") throw new TypeError("Cannot `" + name + "` without `compiler`");
}
/**
* Assert the processor is not frozen.
*
* @param {string} name
* @param {unknown} frozen
* @returns {asserts frozen is false}
*/
function assertUnfrozen(name, frozen) {
	if (frozen) throw new Error("Cannot call `" + name + "` on a frozen processor.\nCreate a new processor first, by calling it: use `processor()` instead of `processor`.");
}
/**
* Assert `node` is a unist node.
*
* @param {unknown} node
* @returns {asserts node is Node}
*/
function assertNode(node) {
	if (!isPlainObject(node) || typeof node.type !== "string") throw new TypeError("Expected node, got `" + node + "`");
}
/**
* Assert that `complete` is `true`.
*
* @param {string} name
* @param {string} asyncName
* @param {unknown} complete
* @returns {asserts complete is true}
*/
function assertDone(name, asyncName, complete) {
	if (!complete) throw new Error("`" + name + "` finished async. Use `" + asyncName + "` instead");
}
/**
* @param {Compatible | undefined} [value]
* @returns {VFile}
*/
function vfile(value) {
	return looksLikeAVFile(value) ? value : new VFile(value);
}
/**
* @param {Compatible | undefined} [value]
* @returns {value is VFile}
*/
function looksLikeAVFile(value) {
	return Boolean(value && typeof value === "object" && "message" in value && "messages" in value);
}
/**
* @param {unknown} [value]
* @returns {value is Value}
*/
function looksLikeAValue(value) {
	return typeof value === "string" || isUint8Array(value);
}
/**
* Assert `value` is an `Uint8Array`.
*
* @param {unknown} value
*   thing.
* @returns {value is Uint8Array}
*   Whether `value` is an `Uint8Array`.
*/
function isUint8Array(value) {
	return Boolean(value && typeof value === "object" && "byteLength" in value && "byteOffset" in value);
}
//#endregion
//#region node_modules/streamdown/dist/chunk-YOKDWASO.js
var import_jsx_runtime = require_jsx_runtime();
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom(), 1);
var cr = 300;
var dr = "300px";
var mr = 500;
function Ut(e = {}) {
	let { immediate: t = false, debounceDelay: o = cr, rootMargin: n = dr, idleTimeout: r = mr } = e, [s, a] = (0, import_react.useState)(false), l = (0, import_react.useRef)(null), i = (0, import_react.useRef)(null), c = (0, import_react.useRef)(null), d = (0, import_react.useMemo)(() => (u) => {
		let f = Date.now();
		return window.setTimeout(() => {
			u({
				didTimeout: false,
				timeRemaining: () => Math.max(0, 50 - (Date.now() - f))
			});
		}, 1);
	}, []), p = (0, import_react.useMemo)(() => typeof window != "undefined" && window.requestIdleCallback ? (u, f) => window.requestIdleCallback(u, f) : d, [d]), m = (0, import_react.useMemo)(() => typeof window != "undefined" && window.cancelIdleCallback ? (u) => window.cancelIdleCallback(u) : (u) => {
		clearTimeout(u);
	}, []);
	return (0, import_react.useEffect)(() => {
		if (t) {
			a(true);
			return;
		}
		let u = l.current;
		if (!u) return;
		i.current && (clearTimeout(i.current), i.current = null), c.current && (m(c.current), c.current = null);
		let f = () => {
			i.current && (clearTimeout(i.current), i.current = null), c.current && (m(c.current), c.current = null);
		}, b = (g) => {
			c.current = p((x) => {
				x.timeRemaining() > 0 || x.didTimeout ? (a(true), g.disconnect()) : c.current = p(() => {
					a(true), g.disconnect();
				}, { timeout: r / 2 });
			}, { timeout: r });
		}, w = (g) => {
			f(), i.current = window.setTimeout(() => {
				var N, T;
				let x = g.takeRecords();
				(x.length === 0 || (T = (N = x.at(-1)) == null ? void 0 : N.isIntersecting) != null && T) && b(g);
			}, o);
		}, y = (g, x) => {
			g.isIntersecting ? w(x) : f();
		}, h = new IntersectionObserver((g) => {
			for (let x of g) y(x, h);
		}, {
			rootMargin: n,
			threshold: 0
		});
		return h.observe(u), () => {
			i.current && clearTimeout(i.current), c.current && m(c.current), h.disconnect();
		};
	}, [
		t,
		o,
		n,
		r,
		m,
		p
	]), {
		shouldRender: s,
		containerRef: l
	};
}
var ur = 320;
var pr = 4;
var eo = () => typeof performance == "undefined" ? Date.now() : performance.now();
function pt(e) {
	var s, a;
	let t = (s = e == null ? void 0 : e.now) != null ? s : eo, o = (a = e == null ? void 0 : e.maxBacklogMs) != null ? a : ur, n = 0, r = 0;
	return {
		now: t,
		beginPass(l) {
			r = Math.min(Math.max(n, l), l + o);
		},
		mark() {
			return r;
		},
		rewind(l) {
			r = l;
		},
		take(l, i, c) {
			if (l <= 0) return {
				baseDelay: 0,
				step: Math.max(0, i)
			};
			let d = Math.max(0, i), p = d === 0 ? 0 : Math.min(d, pr), m = Math.max(r, c), u = c + o, f = m + Math.max(0, l - 1) * d, b = d;
			if (f > u && l > 1) if (m < u) {
				let y = u - m;
				b = Math.max(p, y / (l - 1));
			} else b = p;
			let w = Math.max(0, Math.round(m - c));
			return r = m + l * b, {
				baseDelay: w,
				step: b
			};
		},
		commitPass() {
			n = r;
		}
	};
}
var to = /\s/;
var ft = /^\s+$/;
var fr = /* @__PURE__ */ new Set([
	"pre",
	"svg",
	"math",
	"annotation"
]);
var gr = /* @__PURE__ */ new Set(["img", "hr"]);
var Te = (e) => typeof e == "object" && e !== null && "type" in e && e.type === "element";
var gt = (e) => e.some((t) => Te(t) && fr.has(t.tagName));
var br = (e) => {
	for (let t = e.length - 1; t >= 0; t--) {
		let o = e[t];
		if (Te(o) && o.tagName === "li") return o;
	}
};
var hr = (e, t, o, n) => {
	e.properties ??= {}, e.properties["data-sd-animate-marker"] = true;
	let r = typeof e.properties.style == "string" ? `${e.properties.style};` : "";
	e.properties.style = `${r}--sd-marker-duration:${t}ms;--sd-marker-delay:${Math.round(o)}ms;--sd-marker-easing:${n}`;
};
var yr = /* @__PURE__ */ new Set([
	"ul",
	"ol",
	"li"
]);
var oo = (e) => {
	for (let t of e.children) if (Te(t)) {
		if (t.tagName === "input") return t;
		if (yr.has(t.tagName)) continue;
		let o = oo(t);
		if (o) return o;
	}
};
var no = (e, t, o, n) => {
	e.properties ??= {}, e.properties["data-sd-animate"] = true;
	let r = typeof e.properties.style == "string" ? `${e.properties.style};` : "";
	e.properties.style = `${r}--sd-animation:sd-${t.animation};--sd-duration:${o}ms;--sd-easing:${t.easing};--sd-delay:${Math.round(n)}ms`;
};
var wr = (e, t, o, n) => {
	let r = oo(e);
	r && no(r, t, o, n);
};
var Cr = (e, t, o, n, r, s) => {
	if (gt(t)) return;
	let a = n.prevContentLength, l = r.count;
	r.count += 1;
	let i = a > 0 && l < a, c = i ? 0 : s.baseDelay + r.newIndex++ * s.step;
	no(e, o, i ? 0 : o.duration, c);
};
var xr = (e) => {
	var t;
	for (let o = e.length - 1; o >= 0; o -= 1) {
		let n = e[o];
		if (Te(n)) {
			if ((t = n.properties) != null && t["data-sd-animated"]) break;
			n.properties = {
				...n.properties,
				"data-sd-animated": true
			};
		}
	}
};
var ro = (e) => {
	let t = [], o = "", n = false;
	for (let r of e) {
		let s = to.test(r);
		if (s !== n && o) {
			if (s) {
				o += r, n = true;
				continue;
			}
			t.push(o), o = "";
		}
		o += r, n = s;
	}
	return o && t.push(o), t;
};
var so = (e) => {
	let t = [], o = "";
	for (let n of e) to.test(n) ? t.length > 0 && !ft.test(t.at(-1)) ? t[t.length - 1] += n : o += n : (o && (t.push(o), o = ""), t.push(n));
	return o && (t.length > 0 ? t[t.length - 1] += o : t.push(o)), t;
};
var kr = (e, t, o, n, r, s) => {
	let a = `--sd-animation:sd-${t};--sd-duration:${r ? 0 : o}ms;--sd-easing:${n}`;
	return s && (a += `;--sd-delay:${Math.round(s)}ms`), {
		type: "element",
		tagName: "span",
		properties: {
			"data-sd-animate": true,
			style: a
		},
		children: [{
			type: "text",
			value: e
		}]
	};
};
var Gt = (e, t) => !(e > 0 && t < e);
var ut = (e) => Te(e) && gr.has(e.tagName);
var vr = (e, t, o) => {
	let n = 0, r = 0;
	return visitParents(e, (s) => s.type === "text" || ut(s), (s, a) => {
		if (gt(a)) return SKIP;
		if (ut(s)) {
			Gt(o, r) && (n += 1), r += 1;
			return;
		}
		let l = s.value;
		if (!l.trim()) {
			r += l.length;
			return;
		}
		let i = t.sep === "char" ? so(l) : ro(l);
		for (let c of i) {
			let d = r;
			r += c.length, !ft.test(c) && Gt(o, d) && (n += 1);
		}
	}), n;
};
var Tr = (e, t, o, n, r, s) => {
	var y;
	let a = t.at(-1);
	if (!(a && "children" in a)) return;
	if (gt(t)) return SKIP;
	let l = a, i = l.children.indexOf(e);
	if (i === -1) return;
	let c = e.value;
	if (!c.trim()) {
		r.count += c.length;
		return;
	}
	let d = o.sep === "char" ? so(c) : ro(c), p = n.prevContentLength, m = false, u = br(t), f = !!(u && !((y = u.properties) != null && y["data-sd-animate-marker"])), b = false, w = d.map((h) => {
		let g = r.count;
		if (r.count += h.length, ft.test(h)) return {
			type: "text",
			value: h
		};
		let x = p > 0 && g < p, I = x ? 0 : s.baseDelay + r.newIndex++ * s.step;
		if (m = true, u && f && !b) {
			let N = x ? 0 : o.duration;
			hr(u, N, I, o.easing), wr(u, o, N, I), b = true;
		}
		return kr(h, o.animation, o.duration, o.easing, x, I);
	});
	return m && xr(t), l.children.splice(i, 1, ...w), i + w.length;
};
var Pr = 0;
function je(e) {
	var s, a, l, i, c;
	let t = {
		animation: (s = e == null ? void 0 : e.animation) != null ? s : "fadeIn",
		duration: (a = e == null ? void 0 : e.duration) != null ? a : 150,
		easing: (l = e == null ? void 0 : e.easing) != null ? l : "ease",
		sep: (i = e == null ? void 0 : e.sep) != null ? i : "word",
		stagger: (c = e == null ? void 0 : e.stagger) != null ? c : 40,
		timeline: e == null ? void 0 : e.timeline
	}, o = {
		committedCharCount: 0,
		prevContentLength: 0,
		lastRenderCharCount: 0,
		pendingMark: null
	}, n = Pr++, r = () => (d) => {
		var b;
		let p = {
			count: 0,
			newIndex: 0
		};
		o.prevContentLength = o.committedCharCount;
		let m = t.timeline, u = (b = m == null ? void 0 : m.now()) != null ? b : eo();
		m && (o.pendingMark === null ? o.pendingMark = m.mark() : m.rewind(o.pendingMark));
		let f = m ? m.take(vr(d, t, o.prevContentLength), t.stagger, u) : {
			baseDelay: 0,
			step: t.stagger
		};
		visitParents(d, (w) => w.type === "text" || ut(w), (w, y) => {
			if (w.type === "text") return Tr(w, y, t, o, p, f);
			Cr(w, y, t, o, p, f);
		}), o.lastRenderCharCount = p.count, o.prevContentLength = 0;
	};
	return Object.defineProperty(r, "name", { value: `rehypeAnimate$${n}` }), {
		name: "animate",
		type: "animate",
		rehypePlugin: r,
		setPrevContentLength(d) {
			o.committedCharCount = d, o.prevContentLength = d;
		},
		getLastRenderCharCount() {
			return o.lastRenderCharCount;
		},
		commit() {
			o.committedCharCount = o.lastRenderCharCount, o.pendingMark = null;
		}
	};
}
je();
var bt = (0, import_react.createContext)(false);
var ht = () => (0, import_react.useContext)(bt);
var fe = (...e) => twMerge(clsx(e));
var Nr = (e, t) => {
	if (!e || !t) return t;
	let o = `${e}:`;
	return t.split(/\s+/).filter(Boolean).map((n) => n.startsWith(o) ? n : `${e}:${n}`).join(" ");
};
var lo = (e) => e ? (...t) => Nr(e, twMerge(clsx(t))) : fe;
var J = (e, t, o) => {
	let n = typeof t == "string" && o.startsWith("text/csv") ? "﻿" : "", r = typeof t == "string" ? new Blob([n + t], { type: o }) : t, s = URL.createObjectURL(r), a = document.createElement("a");
	a.href = s, a.download = e, document.body.appendChild(a), a.click(), document.body.removeChild(a), URL.revokeObjectURL(s);
};
var _e = (0, import_react.createContext)(fe);
var C = () => (0, import_react.useContext)(_e);
var Er = 8;
var ze = (e) => {
	if (!(e === void 0 || e === 0 || e === Number.POSITIVE_INFINITY)) {
		if (typeof e == "number") return Number.isFinite(e) && e > 0 ? `${e}px` : void 0;
		if (!(e === "0" || e === "none" || e === "Infinity")) return e;
	}
};
var $e = (e, t, o) => {
	let n = (0, import_react.useRef)(null), r = (0, import_react.useRef)(true), s = (0, import_react.useRef)(false);
	return (0, import_react.useEffect)(() => {
		let a = n.current;
		if (!(a && t)) return;
		let l = () => {
			let i = a.scrollHeight - a.scrollTop - a.clientHeight < Er;
			r.current = i;
		};
		return a.addEventListener("scroll", l, { passive: true }), () => a.removeEventListener("scroll", l);
	}, [t]), (0, import_react.useEffect)(() => {
		e && !s.current && (r.current = true), e || (r.current = true), s.current = e;
	}, [e]), (0, import_react.useEffect)(() => {
		let a = n.current;
		a && t && e && r.current && a.scrollTo({
			top: a.scrollHeight,
			behavior: "instant"
		});
	}, [
		e,
		t,
		o
	]), n;
};
var Ar = fe("block");
var Hr = fe("block", "before:content-[counter(line)]", "before:inline-block", "before:[counter-increment:line]", "before:w-6", "before:mr-4", "before:text-[13px]", "before:text-right", "before:text-muted-foreground/50", "before:font-mono", "before:select-none");
var Br = (e) => {
	let t = {};
	for (let o of e.split(";")) {
		let n = o.indexOf(":");
		if (n > 0) {
			let r = o.slice(0, n).trim(), s = o.slice(n + 1).trim();
			r && s && (t[r] = s);
		}
	}
	return t;
};
var co = (0, import_react.memo)(({ children: e, result: t, language: o, className: n, maxHeight: r, startLine: s, lineNumbers: a = true, ...l }) => {
	let i = C(), { isAnimating: c } = (0, import_react.useContext)(S), d = ze(r), p = $e(c, !!d, t), m = (0, import_react.useMemo)(() => i(Hr), [i]), u = (0, import_react.useMemo)(() => i(Ar), [i]), f = (0, import_react.useMemo)(() => {
		let b = {};
		return t.bg && (b["--sdm-bg"] = t.bg), t.fg && (b["--sdm-fg"] = t.fg), t.rootStyle && Object.assign(b, Br(t.rootStyle)), b;
	}, [
		t.bg,
		t.fg,
		t.rootStyle
	]);
	return (0, import_jsx_runtime.jsx)("div", {
		className: i(n, d ? "overflow-y-auto" : null, "overflow-x-auto rounded-md border border-border bg-background p-4 text-sm"),
		"data-language": o,
		"data-streamdown": "code-block-body",
		ref: p,
		style: d ? { maxHeight: d } : void 0,
		...l,
		children: (0, import_jsx_runtime.jsx)("pre", {
			className: i(n, "bg-[var(--sdm-bg,inherit)]", "dark:bg-[var(--shiki-dark-bg,var(--sdm-bg,inherit))]"),
			style: f,
			children: (0, import_jsx_runtime.jsx)("code", {
				className: a ? i("[counter-increment:line_0] [counter-reset:line]") : void 0,
				style: a && s && s > 1 ? { counterReset: `line ${s - 1}` } : void 0,
				children: t.tokens.map((b, w) => (0, import_jsx_runtime.jsx)("span", {
					className: a ? m : u,
					children: b.length === 0 || b.length === 1 && b[0].content === "" ? `
` : b.map((y, h) => {
						let g = {}, x = !!y.bgColor;
						if (y.color && (g["--sdm-c"] = y.color), y.bgColor && (g["--sdm-tbg"] = y.bgColor), y.htmlStyle) for (let [I, N] of Object.entries(y.htmlStyle)) I === "color" ? g["--sdm-c"] = N : I === "background-color" ? (g["--sdm-tbg"] = N, x = true) : g[I] = N;
						return (0, import_jsx_runtime.jsx)("span", {
							className: i("text-[var(--sdm-c,inherit)]", "dark:text-[var(--shiki-dark,var(--sdm-c,inherit))]", x && "bg-[var(--sdm-tbg)]", x && "dark:bg-[var(--shiki-dark-bg,var(--sdm-tbg))]"),
							style: g,
							...y.htmlAttrs,
							children: y.content
						}, h);
					})
				}, w))
			})
		})
	});
});
var xt = ({ className: e, language: t, style: o, isIncomplete: n, ...r }) => {
	let s = C();
	return (0, import_jsx_runtime.jsx)("div", {
		className: s("my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2", e),
		"data-incomplete": n || void 0,
		"data-language": t,
		"data-streamdown": "code-block",
		style: {
			contentVisibility: "auto",
			containIntrinsicSize: "auto 200px",
			...o
		},
		...r
	});
};
var kt = (0, import_react.createContext)({ code: "" });
var qe = () => (0, import_react.useContext)(kt);
var vt = ({ language: e }) => {
	let t = C();
	return (0, import_jsx_runtime.jsx)("div", {
		className: t("flex h-8 items-center text-muted-foreground text-xs"),
		"data-language": e,
		"data-streamdown": "code-block-header",
		children: (0, import_jsx_runtime.jsx)("span", {
			className: t("ml-1 font-mono lowercase"),
			children: e
		})
	});
};
var $r = (e) => {
	let t = e.length;
	for (; t > 0 && e[t - 1] === `
`;) t--;
	return e.slice(0, t);
};
var qr = (0, import_react.lazy)(() => Promise.resolve().then(() => highlighted_body_KPVGNVTW_exports).then((e) => ({ default: e.HighlightedCodeBlockBody })));
var Tt = ({ code: e, language: t, className: o, children: n, isIncomplete: r = false, startLine: s, lineNumbers: a, ...l }) => {
	let i = C(), { codeBlockMaxHeight: c } = (0, import_react.useContext)(S), d = (0, import_react.useMemo)(() => $r(e), [e]), p = (0, import_react.useMemo)(() => ({
		bg: "transparent",
		fg: "inherit",
		tokens: d.split(`
`).map((m) => [{
			content: m,
			color: "inherit",
			bgColor: "transparent",
			htmlStyle: {},
			offset: 0
		}])
	}), [d]);
	return (0, import_jsx_runtime.jsx)(kt.Provider, {
		value: { code: e },
		children: (0, import_jsx_runtime.jsxs)(xt, {
			dir: "ltr",
			isIncomplete: r,
			language: t,
			children: [
				(0, import_jsx_runtime.jsx)(vt, { language: t }),
				n ? (0, import_jsx_runtime.jsx)("div", {
					className: i("pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end"),
					children: (0, import_jsx_runtime.jsx)("div", {
						className: i("pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur"),
						"data-streamdown": "code-block-actions",
						children: n
					})
				}) : null,
				(0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: (0, import_jsx_runtime.jsx)(co, {
						className: o,
						language: t,
						lineNumbers: a,
						maxHeight: c,
						result: p,
						startLine: s,
						...l
					}),
					children: (0, import_jsx_runtime.jsx)(qr, {
						className: o,
						code: d,
						language: t,
						lineNumbers: a,
						maxHeight: c,
						raw: p,
						startLine: s,
						...l
					})
				})
			]
		})
	});
};
var po = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M15.5607 3.99999L15.0303 4.53032L6.23744 13.3232C5.55403 14.0066 4.44599 14.0066 3.76257 13.3232L4.2929 12.7929L3.76257 13.3232L0.969676 10.5303L0.439346 9.99999L1.50001 8.93933L2.03034 9.46966L4.82323 12.2626C4.92086 12.3602 5.07915 12.3602 5.17678 12.2626L13.9697 3.46966L14.5 2.93933L15.5607 3.99999Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var fo = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M2.75 0.5C1.7835 0.5 1 1.2835 1 2.25V9.75C1 10.7165 1.7835 11.5 2.75 11.5H3.75H4.5V10H3.75H2.75C2.61193 10 2.5 9.88807 2.5 9.75V2.25C2.5 2.11193 2.61193 2 2.75 2H8.25C8.38807 2 8.5 2.11193 8.5 2.25V3H10V2.25C10 1.2835 9.2165 0.5 8.25 0.5H2.75ZM7.75 4.5C6.7835 4.5 6 5.2835 6 6.25V13.75C6 14.7165 6.7835 15.5 7.75 15.5H13.25C14.2165 15.5 15 14.7165 15 13.75V6.25C15 5.2835 14.2165 4.5 13.25 4.5H7.75ZM7.5 6.25C7.5 6.11193 7.61193 6 7.75 6H13.25C13.3881 6 13.5 6.11193 13.5 6.25V13.75C13.5 13.8881 13.3881 14 13.25 14H7.75C7.61193 14 7.5 13.8881 7.5 13.75V6.25Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var go = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M8.75 1V1.75V8.68934L10.7197 6.71967L11.25 6.18934L12.3107 7.25L11.7803 7.78033L8.70711 10.8536C8.31658 11.2441 7.68342 11.2441 7.29289 10.8536L4.21967 7.78033L3.68934 7.25L4.75 6.18934L5.28033 6.71967L7.25 8.68934V1.75V1H8.75ZM13.5 9.25V13.5H2.5V9.25V8.5H1V9.25V14C1 14.5523 1.44771 15 2 15H14C14.5523 15 15 14.5523 15 14V9.25V8.5H13.5V9.25Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var bo = (e) => (0, import_jsx_runtime.jsxs)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: [
		(0, import_jsx_runtime.jsx)("path", {
			d: "M8 0V4",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M8 16V12",
			opacity: "0.5",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M3.29773 1.52783L5.64887 4.7639",
			opacity: "0.9",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M12.7023 1.52783L10.3511 4.7639",
			opacity: "0.1",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M12.7023 14.472L10.3511 11.236",
			opacity: "0.4",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M3.29773 14.472L5.64887 11.236",
			opacity: "0.6",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M15.6085 5.52783L11.8043 6.7639",
			opacity: "0.2",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M0.391602 10.472L4.19583 9.23598",
			opacity: "0.7",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M15.6085 10.4722L11.8043 9.2361",
			opacity: "0.3",
			stroke: "currentColor",
			strokeWidth: "1.5"
		}),
		(0, import_jsx_runtime.jsx)("path", {
			d: "M0.391602 5.52783L4.19583 6.7639",
			opacity: "0.8",
			stroke: "currentColor",
			strokeWidth: "1.5"
		})
	]
});
var ho = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M1 5.25V6H2.5V5.25V2.5H5.25H6V1H5.25H2C1.44772 1 1 1.44772 1 2V5.25ZM5.25 14.9994H6V13.4994H5.25H2.5V10.7494V9.99939H1V10.7494V13.9994C1 14.5517 1.44772 14.9994 2 14.9994H5.25ZM15 10V10.75V14C15 14.5523 14.5523 15 14 15H10.75H10V13.5H10.75H13.5V10.75V10H15ZM10.75 1H10V2.5H10.75H13.5V5.25V6H15V5.25V2C15 1.44772 14.5523 1 14 1H10.75Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var yo = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M13.5 8C13.5 4.96643 11.0257 2.5 7.96452 2.5C5.42843 2.5 3.29365 4.19393 2.63724 6.5H5.25H6V8H5.25H0.75C0.335787 8 0 7.66421 0 7.25V2.75V2H1.5V2.75V5.23347C2.57851 2.74164 5.06835 1 7.96452 1C11.8461 1 15 4.13001 15 8C15 11.87 11.8461 15 7.96452 15C5.62368 15 3.54872 13.8617 2.27046 12.1122L1.828 11.5066L3.03915 10.6217L3.48161 11.2273C4.48831 12.6051 6.12055 13.5 7.96452 13.5C11.0257 13.5 13.5 11.0336 13.5 8Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var wo = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M12.4697 13.5303L13 14.0607L14.0607 13L13.5303 12.4697L9.06065 7.99999L13.5303 3.53032L14.0607 2.99999L13 1.93933L12.4697 2.46966L7.99999 6.93933L3.53032 2.46966L2.99999 1.93933L1.93933 2.99999L2.46966 3.53032L6.93933 7.99999L2.46966 12.4697L1.93933 13L2.99999 14.0607L3.53032 13.5303L7.99999 9.06065L12.4697 13.5303Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var Co = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M13.5 10.25V13.25C13.5 13.3881 13.3881 13.5 13.25 13.5H2.75C2.61193 13.5 2.5 13.3881 2.5 13.25L2.5 2.75C2.5 2.61193 2.61193 2.5 2.75 2.5H5.75H6.5V1H5.75H2.75C1.7835 1 1 1.7835 1 2.75V13.25C1 14.2165 1.7835 15 2.75 15H13.25C14.2165 15 15 14.2165 15 13.25V10.25V9.5H13.5V10.25ZM9 1H9.75H14.2495C14.6637 1 14.9995 1.33579 14.9995 1.75V6.25V7H13.4995V6.25V3.56066L8.53033 8.52978L8 9.06011L6.93934 7.99945L7.46967 7.46912L12.4388 2.5H9.75H9V1Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var xo = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5ZM6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13C8.02469 13 9.42677 12.475 10.5353 11.596L13.9697 15.0303L14.5 15.5607L15.5607 14.5L15.0303 13.9697L11.596 10.5353C12.475 9.42677 13 8.02469 13 6.5C13 2.91015 10.0899 0 6.5 0ZM4.125 5.875H4.75H5.875V4.75V4.125H7.125V4.75V5.875H8.25H8.875V7.125H8.25H7.125V8.25V8.875H5.875V8.25V7.125H4.75H4.125V5.875Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var ko = (e) => (0, import_jsx_runtime.jsx)("svg", {
	"aria-hidden": "true",
	color: "currentColor",
	height: 16,
	strokeLinejoin: "round",
	viewBox: "0 0 16 16",
	width: 16,
	...e,
	children: (0, import_jsx_runtime.jsx)("path", {
		clipRule: "evenodd",
		d: "M1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5ZM6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13C8.02469 13 9.42677 12.475 10.5353 11.596L13.9697 15.0303L14.5 15.5607L15.5607 14.5L15.0303 13.9697L11.596 10.5353C12.475 9.42677 13 8.02469 13 6.5C13 2.91015 10.0899 0 6.5 0ZM4.125 5.875H4.75H8.25H8.875V7.125H8.25H4.75H4.125V5.875Z",
		fill: "currentColor",
		fillRule: "evenodd"
	})
});
var Me = {
	CheckIcon: po,
	CopyIcon: fo,
	DownloadIcon: go,
	ExternalLinkIcon: Co,
	Loader2Icon: bo,
	Maximize2Icon: ho,
	RotateCcwIcon: yo,
	XIcon: wo,
	ZoomInIcon: xo,
	ZoomOutIcon: ko
};
var To = (0, import_react.createContext)(Me);
var Jr = (e, t) => {
	if (e === t) return true;
	if (!(e && t)) return e === t;
	let o = Object.keys(e), n = Object.keys(t);
	return o.length !== n.length ? false : o.every((r) => e[r] === t[r]);
};
var Pt = ({ icons: e, children: t }) => {
	let o = (0, import_react.useRef)(e), n = (0, import_react.useRef)(e ? {
		...Me,
		...e
	} : Me);
	Jr(o.current, e) || (o.current = e, n.current = e ? {
		...Me,
		...e
	} : Me);
	let r = n.current;
	return (0, import_jsx_runtime.jsx)(To.Provider, {
		value: r,
		children: t
	});
};
var H = () => (0, import_react.useContext)(To);
var We = {
	copyCode: "Copy Code",
	downloadFile: "Download file",
	downloadDiagram: "Download diagram",
	downloadDiagramAsSvg: "Download diagram as SVG",
	downloadDiagramAsPng: "Download diagram as PNG",
	downloadDiagramAsMmd: "Download diagram as MMD",
	viewFullscreen: "View fullscreen",
	exitFullscreen: "Exit fullscreen",
	mermaidFormatSvg: "SVG",
	mermaidFormatPng: "PNG",
	mermaidFormatMmd: "MMD",
	zoomIn: "Zoom in",
	zoomOut: "Zoom out",
	resetView: "Reset zoom and pan",
	copyTable: "Copy table",
	copyTableAsMarkdown: "Copy table as Markdown",
	copyTableAsCsv: "Copy table as CSV",
	copyTableAsTsv: "Copy table as TSV",
	downloadTable: "Download table",
	downloadTableAsCsv: "Download table as CSV",
	downloadTableAsMarkdown: "Download table as Markdown",
	tableFormatMarkdown: "Markdown",
	tableFormatCsv: "CSV",
	tableFormatTsv: "TSV",
	imageNotAvailable: "Image not available",
	downloadImage: "Download image",
	openExternalLink: "Open external link?",
	externalLinkWarning: "You're about to visit an external website.",
	close: "Close",
	copyLink: "Copy link",
	copied: "Copied",
	openLink: "Open link"
};
var Ze = (0, import_react.createContext)(We);
var B = () => (0, import_react.useContext)(Ze);
var ge = ({ onCopy: e, onError: t, timeout: o = 2e3, children: n, className: r, code: s, ...a }) => {
	let l = C(), [i, c] = (0, import_react.useState)(false), d = (0, import_react.useRef)(0), { code: p } = qe(), { isAnimating: m } = (0, import_react.useContext)(S), u = B(), f = s != null ? s : p, b = async () => {
		var h;
		if (typeof window == "undefined" || !((h = navigator == null ? void 0 : navigator.clipboard) != null && h.writeText)) {
			t?.(/* @__PURE__ */ new Error("Clipboard API not available"));
			return;
		}
		try {
			i || (await navigator.clipboard.writeText(f), c(!0), e?.(), d.current = window.setTimeout(() => c(!1), o));
		} catch (g) {
			t?.(g);
		}
	};
	(0, import_react.useEffect)(() => () => {
		window.clearTimeout(d.current);
	}, []);
	let w = H(), y = i ? w.CheckIcon : w.CopyIcon;
	return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)("button", {
		"aria-label": u.copyCode,
		className: l("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", r),
		"data-streamdown": "code-block-copy-button",
		disabled: m,
		onClick: b,
		title: u.copyCode,
		type: "button",
		...a,
		children: n != null ? n : (0, import_jsx_runtime.jsx)(y, {
			"aria-hidden": "true",
			size: 14
		})
	}), i && (0, import_jsx_runtime.jsx)("output", {
		"aria-live": "polite",
		className: "sr-only",
		children: u.copied
	})] });
};
var ie = (e, t, o) => {
	if (typeof e == "boolean") return o;
	let n = e[t];
	if (typeof n != "object") return o;
	let r = n.download;
	return typeof r != "object" ? o : r.filename || o;
};
var Po = {
	"1c": "1c",
	"1c-query": "1cq",
	abap: "abap",
	"actionscript-3": "as",
	ada: "ada",
	adoc: "adoc",
	"angular-html": "html",
	"angular-ts": "ts",
	apache: "conf",
	apex: "cls",
	apl: "apl",
	applescript: "applescript",
	ara: "ara",
	asciidoc: "adoc",
	asm: "asm",
	astro: "astro",
	awk: "awk",
	ballerina: "bal",
	bash: "sh",
	bat: "bat",
	batch: "bat",
	be: "be",
	beancount: "beancount",
	berry: "berry",
	bibtex: "bib",
	bicep: "bicep",
	blade: "blade.php",
	bsl: "bsl",
	c: "c",
	"c#": "cs",
	"c++": "cpp",
	cadence: "cdc",
	cairo: "cairo",
	cdc: "cdc",
	clarity: "clar",
	clj: "clj",
	clojure: "clj",
	"closure-templates": "soy",
	cmake: "cmake",
	cmd: "cmd",
	cobol: "cob",
	codeowners: "CODEOWNERS",
	codeql: "ql",
	coffee: "coffee",
	coffeescript: "coffee",
	"common-lisp": "lisp",
	console: "sh",
	coq: "v",
	cpp: "cpp",
	cql: "cql",
	crystal: "cr",
	cs: "cs",
	csharp: "cs",
	css: "css",
	csv: "csv",
	cue: "cue",
	cypher: "cql",
	d: "d",
	dart: "dart",
	dax: "dax",
	desktop: "desktop",
	diff: "diff",
	docker: "dockerfile",
	dockerfile: "dockerfile",
	dotenv: "env",
	"dream-maker": "dm",
	edge: "edge",
	elisp: "el",
	elixir: "ex",
	elm: "elm",
	"emacs-lisp": "el",
	erb: "erb",
	erl: "erl",
	erlang: "erl",
	f: "f",
	"f#": "fs",
	f03: "f03",
	f08: "f08",
	f18: "f18",
	f77: "f77",
	f90: "f90",
	f95: "f95",
	fennel: "fnl",
	fish: "fish",
	fluent: "ftl",
	for: "for",
	"fortran-fixed-form": "f",
	"fortran-free-form": "f90",
	fs: "fs",
	fsharp: "fs",
	fsl: "fsl",
	ftl: "ftl",
	gdresource: "tres",
	gdscript: "gd",
	gdshader: "gdshader",
	genie: "gs",
	gherkin: "feature",
	"git-commit": "gitcommit",
	"git-rebase": "gitrebase",
	gjs: "js",
	gleam: "gleam",
	"glimmer-js": "js",
	"glimmer-ts": "ts",
	glsl: "glsl",
	gnuplot: "plt",
	go: "go",
	gql: "gql",
	graphql: "graphql",
	groovy: "groovy",
	gts: "gts",
	hack: "hack",
	haml: "haml",
	handlebars: "hbs",
	haskell: "hs",
	haxe: "hx",
	hbs: "hbs",
	hcl: "hcl",
	hjson: "hjson",
	hlsl: "hlsl",
	hs: "hs",
	html: "html",
	"html-derivative": "html",
	http: "http",
	hxml: "hxml",
	hy: "hy",
	imba: "imba",
	ini: "ini",
	jade: "jade",
	java: "java",
	javascript: "js",
	jinja: "jinja",
	jison: "jison",
	jl: "jl",
	js: "js",
	json: "json",
	json5: "json5",
	jsonc: "jsonc",
	jsonl: "jsonl",
	jsonnet: "jsonnet",
	jssm: "jssm",
	jsx: "jsx",
	julia: "jl",
	kotlin: "kt",
	kql: "kql",
	kt: "kt",
	kts: "kts",
	kusto: "kql",
	latex: "tex",
	lean: "lean",
	lean4: "lean",
	less: "less",
	liquid: "liquid",
	lisp: "lisp",
	lit: "lit",
	llvm: "ll",
	log: "log",
	logo: "logo",
	lua: "lua",
	luau: "luau",
	make: "mak",
	makefile: "mak",
	markdown: "md",
	marko: "marko",
	matlab: "m",
	md: "md",
	mdc: "mdc",
	mdx: "mdx",
	mediawiki: "wiki",
	mermaid: "mmd",
	mips: "s",
	mipsasm: "s",
	mmd: "mmd",
	mojo: "mojo",
	move: "move",
	nar: "nar",
	narrat: "narrat",
	nextflow: "nf",
	nf: "nf",
	nginx: "conf",
	nim: "nim",
	nix: "nix",
	nu: "nu",
	nushell: "nu",
	objc: "m",
	"objective-c": "m",
	"objective-cpp": "mm",
	ocaml: "ml",
	pascal: "pas",
	perl: "pl",
	perl6: "p6",
	php: "php",
	plsql: "pls",
	po: "po",
	polar: "polar",
	postcss: "pcss",
	pot: "pot",
	potx: "potx",
	powerquery: "pq",
	powershell: "ps1",
	prisma: "prisma",
	prolog: "pl",
	properties: "properties",
	proto: "proto",
	protobuf: "proto",
	ps: "ps",
	ps1: "ps1",
	pug: "pug",
	puppet: "pp",
	purescript: "purs",
	py: "py",
	python: "py",
	ql: "ql",
	qml: "qml",
	qmldir: "qmldir",
	qss: "qss",
	r: "r",
	racket: "rkt",
	raku: "raku",
	razor: "cshtml",
	rb: "rb",
	reg: "reg",
	regex: "regex",
	regexp: "regexp",
	rel: "rel",
	riscv: "s",
	rs: "rs",
	rst: "rst",
	ruby: "rb",
	rust: "rs",
	sas: "sas",
	sass: "sass",
	scala: "scala",
	scheme: "scm",
	scss: "scss",
	sdbl: "sdbl",
	sh: "sh",
	shader: "shader",
	shaderlab: "shader",
	shell: "sh",
	shellscript: "sh",
	shellsession: "sh",
	smalltalk: "st",
	solidity: "sol",
	soy: "soy",
	sparql: "rq",
	spl: "spl",
	splunk: "spl",
	sql: "sql",
	"ssh-config": "config",
	stata: "do",
	styl: "styl",
	stylus: "styl",
	svelte: "svelte",
	swift: "swift",
	"system-verilog": "sv",
	systemd: "service",
	talon: "talon",
	talonscript: "talon",
	tasl: "tasl",
	tcl: "tcl",
	templ: "templ",
	terraform: "tf",
	tex: "tex",
	tf: "tf",
	tfvars: "tfvars",
	toml: "toml",
	ts: "ts",
	"ts-tags": "ts",
	tsp: "tsp",
	tsv: "tsv",
	tsx: "tsx",
	turtle: "ttl",
	twig: "twig",
	typ: "typ",
	typescript: "ts",
	typespec: "tsp",
	typst: "typ",
	v: "v",
	vala: "vala",
	vb: "vb",
	verilog: "v",
	vhdl: "vhdl",
	vim: "vim",
	viml: "vim",
	vimscript: "vim",
	vue: "vue",
	"vue-html": "html",
	"vue-vine": "vine",
	vy: "vy",
	vyper: "vy",
	wasm: "wasm",
	wenyan: "wy",
	wgsl: "wgsl",
	wiki: "wiki",
	wikitext: "wiki",
	wit: "wit",
	wl: "wl",
	wolfram: "wl",
	xml: "xml",
	xsl: "xsl",
	yaml: "yaml",
	yml: "yml",
	zenscript: "zs",
	zig: "zig",
	zsh: "zsh",
	文言: "wy"
};
var It = ({ onDownload: e, onError: t, language: o, children: n, className: r, code: s, ...a }) => {
	let l = C(), { code: i } = qe(), { isAnimating: c, controls: d } = (0, import_react.useContext)(S), p = B(), m = H(), u = s != null ? s : i, f = o && o in Po ? Po[o] : "txt", b = `${ie(d, "code", "file")}.${f}`, w = "text/plain", y = () => {
		try {
			J(b, u, w), e?.();
		} catch (h) {
			t?.(h);
		}
	};
	return (0, import_jsx_runtime.jsx)("button", {
		"aria-label": p.downloadFile,
		className: l("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", r),
		"data-streamdown": "code-block-download-button",
		disabled: c,
		onClick: y,
		title: p.downloadFile,
		type: "button",
		...a,
		children: n != null ? n : (0, import_jsx_runtime.jsx)(m.DownloadIcon, { size: 14 })
	});
};
var Xe = () => {
	let { Loader2Icon: e } = H(), t = C();
	return (0, import_jsx_runtime.jsxs)("div", {
		className: t("w-full divide-y divide-border overflow-hidden rounded-xl border border-border"),
		children: [(0, import_jsx_runtime.jsx)("div", { className: t("h-[46px] w-full bg-muted/80") }), (0, import_jsx_runtime.jsx)("div", {
			className: t("flex w-full items-center justify-center p-4"),
			children: (0, import_jsx_runtime.jsx)(e, { className: t("size-4 animate-spin") })
		})]
	});
};
var cs = /\.[^/.]+$/;
var So = ({ node: e, className: t, src: o, alt: n, onLoad: r, onError: s, showControls: a = true, showDownloadControl: l = true, ...i }) => {
	let { DownloadIcon: c } = H(), d = C(), p = (0, import_react.useRef)(null), [m, u] = (0, import_react.useState)(false), [f, b] = (0, import_react.useState)(false), w = B(), y = i.width != null || i.height != null, g = (m || y) && !f && a && l, x = f && !y;
	(0, import_react.useEffect)(() => {
		let M = p.current;
		if (M != null && M.complete) {
			let E = M.naturalWidth > 0;
			u(E), b(!E);
		}
	}, []);
	let I = (0, import_react.useCallback)((M) => {
		u(true), b(false), r?.(M);
	}, [r]), N = (0, import_react.useCallback)((M) => {
		u(false), b(true), s?.(M);
	}, [s]), T = async () => {
		if (o) try {
			let E = await (await fetch(o)).blob(), _ = new URL(o, window.location.origin).pathname.split("/").pop() || "", W = _.split(".").pop(), X = _.includes(".") && W !== void 0 && W.length <= 4, K = "";
			if (X) K = _;
			else {
				let j = E.type, O = "png";
				j.includes("jpeg") || j.includes("jpg") ? O = "jpg" : j.includes("png") ? O = "png" : j.includes("svg") ? O = "svg" : j.includes("gif") ? O = "gif" : j.includes("webp") && (O = "webp"), K = `${(n || _ || "image").replace(cs, "")}.${O}`;
			}
			J(K, E, E.type);
		} catch (M) {
			window.open(o, "_blank");
		}
	};
	return o ? (0, import_jsx_runtime.jsxs)("div", {
		className: d("group relative my-4 inline-block"),
		"data-streamdown": "image-wrapper",
		children: [
			(0, import_jsx_runtime.jsx)("img", {
				alt: n,
				className: d("max-w-full rounded-lg", x && "hidden", t),
				"data-streamdown": "image",
				onError: N,
				onLoad: I,
				ref: p,
				src: o,
				...i
			}),
			x && (0, import_jsx_runtime.jsx)("span", {
				className: d("text-muted-foreground text-xs italic"),
				"data-streamdown": "image-fallback",
				children: w.imageNotAvailable
			}),
			a && (0, import_jsx_runtime.jsx)("div", {
				className: d("pointer-events-none absolute inset-0 hidden rounded-lg bg-black/10 group-hover:block"),
				"data-streamdown": "image-overlay"
			}),
			g && (0, import_jsx_runtime.jsx)("button", {
				className: d("absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-background", "opacity-0 group-hover:opacity-100"),
				onClick: T,
				title: w.downloadImage,
				type: "button",
				children: (0, import_jsx_runtime.jsx)(c, { size: 14 })
			})
		]
	}) : null;
};
var Ne = 0;
var be = () => {
	Ne += 1, Ne === 1 && (document.body.style.overflow = "hidden");
};
var he = () => {
	Ne = Math.max(0, Ne - 1), Ne === 0 && (document.body.style.overflow = "");
};
var Lo = ({ url: e, isOpen: t, onClose: o, onConfirm: n }) => {
	let { CheckIcon: r, CopyIcon: s, ExternalLinkIcon: a, XIcon: l } = H(), i = C(), [c, d] = (0, import_react.useState)(false), p = B(), m = (0, import_react.useCallback)(async () => {
		try {
			await navigator.clipboard.writeText(e), d(!0), setTimeout(() => d(!1), 2e3);
		} catch (b) {}
	}, [e]), u = (0, import_react.useCallback)(() => {
		n(), o();
	}, [n, o]);
	if ((0, import_react.useEffect)(() => {
		if (t) {
			be();
			let b = (w) => {
				w.key === "Escape" && o();
			};
			return document.addEventListener("keydown", b), () => {
				document.removeEventListener("keydown", b), he();
			};
		}
	}, [t, o]), !t || typeof document == "undefined") return null;
	let f = (0, import_jsx_runtime.jsx)("div", {
		className: i("fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"),
		"data-streamdown": "link-safety-modal",
		onClick: o,
		onKeyDown: (b) => {
			b.key === "Escape" && o();
		},
		role: "button",
		tabIndex: 0,
		children: (0, import_jsx_runtime.jsxs)("div", {
			className: i("relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg"),
			onClick: (b) => b.stopPropagation(),
			onKeyDown: (b) => b.stopPropagation(),
			role: "presentation",
			children: [
				(0, import_jsx_runtime.jsx)("button", {
					className: i("absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"),
					onClick: o,
					title: p.close,
					type: "button",
					children: (0, import_jsx_runtime.jsx)(l, { size: 16 })
				}),
				(0, import_jsx_runtime.jsxs)("div", {
					className: i("flex flex-col gap-2"),
					children: [(0, import_jsx_runtime.jsxs)("div", {
						className: i("flex items-center gap-2 font-semibold text-lg"),
						children: [(0, import_jsx_runtime.jsx)(a, { size: 20 }), (0, import_jsx_runtime.jsx)("span", { children: p.openExternalLink })]
					}), (0, import_jsx_runtime.jsx)("p", {
						className: i("text-muted-foreground text-sm"),
						children: p.externalLinkWarning
					})]
				}),
				(0, import_jsx_runtime.jsx)("div", {
					className: i("break-all rounded-md bg-muted p-3 font-mono text-sm", e.length > 100 && "max-h-32 overflow-y-auto"),
					children: e
				}),
				(0, import_jsx_runtime.jsxs)("div", {
					className: i("flex gap-2"),
					children: [(0, import_jsx_runtime.jsx)("button", {
						className: i("flex flex-1 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 font-medium text-sm transition-all hover:bg-muted"),
						onClick: m,
						type: "button",
						children: c ? (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)(r, { size: 14 }), (0, import_jsx_runtime.jsx)("span", { children: p.copied })] }) : (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)(s, { size: 14 }), (0, import_jsx_runtime.jsx)("span", { children: p.copyLink })] })
					}), (0, import_jsx_runtime.jsxs)("button", {
						className: i("flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-all hover:bg-primary/90"),
						onClick: u,
						type: "button",
						children: [(0, import_jsx_runtime.jsx)(a, { size: 14 }), (0, import_jsx_runtime.jsx)("span", { children: p.openLink })]
					})]
				})
			]
		})
	});
	return (0, import_react_dom.createPortal)(f, document.body);
};
var Ke = (0, import_react.createContext)(null);
var St = () => (0, import_react.useContext)(Ke);
var El = () => {
	var t;
	let e = St();
	return (t = e == null ? void 0 : e.code) != null ? t : null;
};
var ye = () => {
	var t;
	let e = St();
	return (t = e == null ? void 0 : e.mermaid) != null ? t : null;
};
var Do = (e) => {
	var o;
	let t = St();
	return t != null && t.renderers && e && (o = t.renderers.find((n) => Array.isArray(n.language) ? n.language.includes(e) : n.language === e)) != null ? o : null;
};
var Ao = (e) => {
	if (typeof DOMParser == "undefined" || typeof XMLSerializer == "undefined") return e;
	let o = new DOMParser().parseFromString(e, "text/html").querySelector("svg");
	return o ? new XMLSerializer().serializeToString(o) : e;
};
var Ho = (e, t) => {
	var n;
	let o = (n = void 0) != null ? n : 5;
	return new Promise((r, s) => {
		let a = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(e))), l = new Image();
		l.crossOrigin = "anonymous", l.onload = () => {
			let i = document.createElement("canvas"), c = l.width * o, d = l.height * o;
			i.width = c, i.height = d;
			let p = i.getContext("2d");
			if (!p) {
				s(/* @__PURE__ */ new Error("Failed to create 2D canvas context for PNG export"));
				return;
			}
			p.drawImage(l, 0, 0, c, d), i.toBlob((m) => {
				if (!m) {
					s(/* @__PURE__ */ new Error("Failed to create PNG blob"));
					return;
				}
				r(m);
			}, "image/png");
		}, l.onerror = () => s(/* @__PURE__ */ new Error("Failed to load SVG image")), l.src = a;
	});
};
var Je = ({ chart: e, children: t, className: o, onDownload: n, config: r, onError: s }) => {
	let a = C(), [l, i] = (0, import_react.useState)(false), c = (0, import_react.useRef)(null), { isAnimating: d, controls: p } = (0, import_react.useContext)(S), m = H(), u = ye(), f = B(), b = ie(p, "mermaid", "diagram"), w = async (y) => {
		try {
			if (y === "mmd") {
				J(`${b}.mmd`, e, "text/plain"), i(!1), n?.(y);
				return;
			}
			if (!u) {
				s?.(/* @__PURE__ */ new Error("Mermaid plugin not available"));
				return;
			}
			let h = u.getMermaid(r), g = e.split("").reduce((T, M) => (T << 5) - T + M.charCodeAt(0) | 0, 0), x = `mermaid-${Math.abs(g)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, { svg: I } = await h.render(x, e);
			if (!I) {
				s?.(/* @__PURE__ */ new Error("SVG not found. Please wait for the diagram to render."));
				return;
			}
			let N = Ao(I);
			if (y === "svg") {
				J(`${b}.svg`, N, "image/svg+xml"), i(!1), n?.(y);
				return;
			}
			if (y === "png") {
				let T = await Ho(N);
				J(`${b}.png`, T, "image/png"), n?.(y), i(!1);
				return;
			}
		} catch (h) {
			s?.(h);
		}
	};
	return (0, import_react.useEffect)(() => {
		let y = (h) => {
			let g = h.composedPath();
			c.current && !g.includes(c.current) && i(false);
		};
		return document.addEventListener("mousedown", y), () => {
			document.removeEventListener("mousedown", y);
		};
	}, []), (0, import_jsx_runtime.jsxs)("div", {
		className: a("relative"),
		ref: c,
		children: [(0, import_jsx_runtime.jsx)("button", {
			"aria-label": f.downloadDiagram,
			className: a("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", o),
			disabled: d,
			onClick: () => i(!l),
			title: f.downloadDiagram,
			type: "button",
			children: t != null ? t : (0, import_jsx_runtime.jsx)(m.DownloadIcon, {
				"aria-hidden": "true",
				size: 14
			})
		}), l ? (0, import_jsx_runtime.jsxs)("div", {
			className: a("absolute top-full right-0 z-10 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg"),
			children: [
				(0, import_jsx_runtime.jsx)("button", {
					"aria-label": f.downloadDiagramAsSvg,
					className: a("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"),
					onClick: () => w("svg"),
					title: f.downloadDiagramAsSvg,
					type: "button",
					children: f.mermaidFormatSvg
				}),
				(0, import_jsx_runtime.jsx)("button", {
					"aria-label": f.downloadDiagramAsPng,
					className: a("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"),
					onClick: () => w("png"),
					title: f.downloadDiagramAsPng,
					type: "button",
					children: f.mermaidFormatPng
				}),
				(0, import_jsx_runtime.jsx)("button", {
					"aria-label": f.downloadDiagramAsMmd,
					className: a("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"),
					onClick: () => w("mmd"),
					title: f.downloadDiagramAsMmd,
					type: "button",
					children: f.mermaidFormatMmd
				})
			]
		}) : null]
	});
};
var Fo = ({ chart: e, config: t, onFullscreen: o, onExit: n, className: r, ...s }) => {
	let { Maximize2Icon: a, XIcon: l } = H(), i = C(), [c, d] = (0, import_react.useState)(false), { isAnimating: p, controls: m } = (0, import_react.useContext)(S), u = B(), f = (() => {
		if (typeof m == "boolean") return m;
		let h = m.mermaid;
		return h === false ? false : h === true || h === void 0 ? true : h.panZoom !== false;
	})(), b = (() => {
		if (typeof m == "boolean") return m;
		let h = m.mermaid;
		return h === false ? false : h === true || h === void 0 ? true : h.download !== false;
	})(), w = (() => {
		if (typeof m == "boolean") return m;
		let h = m.mermaid;
		return h === false ? false : h === true || h === void 0 ? true : h.copy !== false;
	})(), y = () => {
		d(!c);
	};
	return (0, import_react.useEffect)(() => {
		if (c) {
			be();
			let h = (g) => {
				g.key === "Escape" && d(false);
			};
			return document.addEventListener("keydown", h), () => {
				document.removeEventListener("keydown", h), he();
			};
		}
	}, [c]), (0, import_react.useEffect)(() => {
		c ? o?.() : n && n();
	}, [
		c,
		o,
		n
	]), (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)("button", {
		className: i("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", r),
		disabled: p,
		onClick: y,
		title: u.viewFullscreen,
		type: "button",
		...s,
		"aria-label": u.viewFullscreen,
		children: (0, import_jsx_runtime.jsx)(a, {
			"aria-hidden": "true",
			size: 14
		})
	}), c ? (0, import_react_dom.createPortal)((0, import_jsx_runtime.jsxs)("div", {
		"aria-label": u.viewFullscreen,
		"aria-modal": "true",
		className: i("fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"),
		"data-streamdown": "mermaid-fullscreen",
		onClick: y,
		onKeyDown: (h) => {
			h.key === "Escape" && y();
		},
		role: "dialog",
		children: [(0, import_jsx_runtime.jsxs)("div", {
			className: i("absolute top-4 right-4 z-10 flex items-center gap-1"),
			onClick: (h) => h.stopPropagation(),
			onKeyDown: (h) => h.stopPropagation(),
			role: "presentation",
			children: [
				b ? (0, import_jsx_runtime.jsx)(Je, {
					chart: e,
					config: t
				}) : null,
				w ? (0, import_jsx_runtime.jsx)(ge, { code: e }) : null,
				(0, import_jsx_runtime.jsx)("button", {
					"aria-label": u.exitFullscreen,
					className: i("rounded-md p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"),
					onClick: y,
					title: u.exitFullscreen,
					type: "button",
					children: (0, import_jsx_runtime.jsx)(l, {
						"aria-hidden": "true",
						size: 20
					})
				})
			]
		}), (0, import_jsx_runtime.jsx)("div", {
			className: i("flex size-full items-center justify-center p-4"),
			onClick: (h) => h.stopPropagation(),
			onKeyDown: (h) => h.stopPropagation(),
			role: "presentation",
			children: (0, import_jsx_runtime.jsx)(Vo, {
				chart: e,
				className: i("size-full [&_svg]:h-auto [&_svg]:w-auto"),
				config: t,
				fullscreen: true,
				showControls: f
			})
		})]
	}), document.body) : null] });
};
function Et(e) {
	var o;
	if (e.nodeType === Node.TEXT_NODE) return (o = e.textContent) != null ? o : "";
	if (e.nodeType !== Node.ELEMENT_NODE) return "";
	let t = e;
	return t.tagName === "BR" ? `
` : Array.from(t.childNodes).map(Et).join("");
}
var we = (e) => {
	let t = [], o = [], n = e.querySelectorAll("thead th");
	for (let s of n) t.push(Et(s).trim());
	let r = e.querySelectorAll("tbody tr");
	for (let s of r) {
		let a = [], l = s.querySelectorAll("td");
		for (let i of l) a.push(Et(i).trim());
		o.push(a);
	}
	return {
		headers: t,
		rows: o
	};
};
var Re = (e) => {
	var o;
	if (typeof e != "object") return ",";
	let t = e.table;
	return typeof t != "object" ? "," : (o = t.csvSeparator) != null ? o : ",";
};
var ce = (e, t = ",") => {
	let o;
	t === "auto" ? Intl.NumberFormat().format(1.1).includes(",") ? o = ";" : o = "," : o = t;
	let { headers: n, rows: r } = e, s = (c) => {
		let d = false;
		for (let p of c) if (p === o || p === "\"" || p === `
` || p === "\r") {
			d = true;
			break;
		}
		return d ? `"${c.replace(/"/g, "\"\"")}"` : c;
	}, a = n.length > 0 ? r.length + 1 : r.length, l = new Array(a), i = 0;
	n.length > 0 && (l[i] = n.map(s).join(o), i += 1);
	for (let c of r) l[i] = c.map(s).join(o), i += 1;
	return l.join(`
`);
};
var Lt = (e) => {
	let { headers: t, rows: o } = e, n = (l) => {
		let i = false;
		for (let d of l) if (d === "	" || d === `
` || d === "\r") {
			i = true;
			break;
		}
		if (!i) return l;
		let c = [];
		for (let d of l) d === "	" ? c.push("\\t") : d === `
` ? c.push("\\n") : d === "\r" ? c.push("\\r") : c.push(d);
		return c.join("");
	}, r = t.length > 0 ? o.length + 1 : o.length, s = new Array(r), a = 0;
	t.length > 0 && (s[a] = t.map(n).join("	"), a += 1);
	for (let l of o) s[a] = l.map(n).join("	"), a += 1;
	return s.join(`
`);
};
var Ue = (e) => {
	let t = false;
	for (let n of e) if (n === "\\" || n === "|" || n === `
`) {
		t = true;
		break;
	}
	if (!t) return e;
	let o = [];
	for (let n of e) n === "\\" ? o.push("\\\\") : n === "|" ? o.push("\\|") : n === `
` ? o.push("<br>") : o.push(n);
	return o.join("");
};
var Ce = (e) => {
	let { headers: t, rows: o } = e;
	if (t.length === 0) return "";
	let n = new Array(o.length + 2), r = 0, s = t.map((l) => Ue(l));
	n[r] = `| ${s.join(" | ")} |`, r += 1;
	let a = new Array(t.length);
	for (let l = 0; l < t.length; l += 1) a[l] = "---";
	n[r] = `| ${a.join(" | ")} |`, r += 1;
	for (let l of o) if (l.length < t.length) {
		let i = new Array(t.length);
		for (let c = 0; c < t.length; c += 1) i[c] = c < l.length ? Ue(l[c]) : "";
		n[r] = `| ${i.join(" | ")} |`, r += 1;
	} else {
		let i = l.map((c) => Ue(c));
		n[r] = `| ${i.join(" | ")} |`, r += 1;
	}
	return n.join(`
`);
};
var Le = ({ children: e, className: t, onCopy: o, onError: n, timeout: r = 2e3 }) => {
	let s = C(), [a, l] = (0, import_react.useState)(false), [i, c] = (0, import_react.useState)(false), d = (0, import_react.useRef)(null), p = (0, import_react.useRef)(0), { isAnimating: m, controls: u } = (0, import_react.useContext)(S), f = B(), b = Re(u), w = async (g) => {
		var x, I;
		if (typeof window == "undefined" || !((x = navigator == null ? void 0 : navigator.clipboard) != null && x.write)) {
			n?.(/* @__PURE__ */ new Error("Clipboard API not available"));
			return;
		}
		try {
			let N = (I = d.current) == null ? void 0 : I.closest("[data-streamdown=\"table-wrapper\"]"), T = N == null ? void 0 : N.querySelector("table");
			if (!T) {
				n?.(/* @__PURE__ */ new Error("Table not found"));
				return;
			}
			let M = we(T), E = "";
			g === "csv" ? E = ce(M, b) : g === "tsv" ? E = Lt(M) : E = Ce(M);
			let q = new ClipboardItem({
				"text/plain": new Blob([E], { type: "text/plain" }),
				"text/html": new Blob([T.outerHTML], { type: "text/html" })
			});
			await navigator.clipboard.write([q]), c(!0), l(!1), o?.(g), p.current = window.setTimeout(() => c(!1), r);
		} catch (N) {
			n?.(N);
		}
	};
	(0, import_react.useEffect)(() => {
		let g = (x) => {
			let I = x.composedPath();
			d.current && !I.includes(d.current) && l(false);
		};
		return document.addEventListener("mousedown", g), () => {
			document.removeEventListener("mousedown", g), window.clearTimeout(p.current);
		};
	}, []);
	let y = H(), h = i ? y.CheckIcon : y.CopyIcon;
	return (0, import_jsx_runtime.jsxs)("div", {
		className: s("relative"),
		ref: d,
		children: [(0, import_jsx_runtime.jsx)("button", {
			className: s("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", t),
			disabled: m,
			onClick: () => l(!a),
			title: f.copyTable,
			type: "button",
			children: e != null ? e : (0, import_jsx_runtime.jsx)(h, {
				height: 14,
				width: 14
			})
		}), a ? (0, import_jsx_runtime.jsxs)("div", {
			className: s("absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg"),
			children: [
				(0, import_jsx_runtime.jsx)("button", {
					className: s("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"),
					onClick: () => w("md"),
					title: f.copyTableAsMarkdown,
					type: "button",
					children: f.tableFormatMarkdown
				}),
				(0, import_jsx_runtime.jsx)("button", {
					className: s("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"),
					onClick: () => w("csv"),
					title: f.copyTableAsCsv,
					type: "button",
					children: f.tableFormatCsv
				}),
				(0, import_jsx_runtime.jsx)("button", {
					className: s("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"),
					onClick: () => w("tsv"),
					title: f.copyTableAsTsv,
					type: "button",
					children: f.tableFormatTsv
				})
			]
		}) : null]
	});
};
var De = ({ children: e, className: t, onDownload: o, onError: n }) => {
	let r = C(), [s, a] = (0, import_react.useState)(false), l = (0, import_react.useRef)(null), { isAnimating: i, controls: c } = (0, import_react.useContext)(S), d = B(), p = H(), m = Re(c), u = (f) => {
		var b;
		try {
			let w = (b = l.current) == null ? void 0 : b.closest("[data-streamdown=\"table-wrapper\"]"), y = w == null ? void 0 : w.querySelector("table");
			if (!y) {
				n?.(/* @__PURE__ */ new Error("Table not found"));
				return;
			}
			let h = we(y), g = f === "csv" ? ce(h, m) : Ce(h), x = f === "csv" ? "csv" : "md";
			J(`${ie(c, "table", "table")}.${x}`, g, f === "csv" ? "text/csv" : "text/markdown"), a(!1), o?.(f);
		} catch (w) {
			n?.(w);
		}
	};
	return (0, import_react.useEffect)(() => {
		let f = (b) => {
			let w = b.composedPath();
			l.current && !w.includes(l.current) && a(false);
		};
		return document.addEventListener("mousedown", f), () => {
			document.removeEventListener("mousedown", f);
		};
	}, []), (0, import_jsx_runtime.jsxs)("div", {
		className: r("relative"),
		ref: l,
		children: [(0, import_jsx_runtime.jsx)("button", {
			className: r("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", t),
			disabled: i,
			onClick: () => a(!s),
			title: d.downloadTable,
			type: "button",
			children: e != null ? e : (0, import_jsx_runtime.jsx)(p.DownloadIcon, { size: 14 })
		}), s ? (0, import_jsx_runtime.jsxs)("div", {
			className: r("absolute top-full right-0 z-20 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-background shadow-lg"),
			children: [(0, import_jsx_runtime.jsx)("button", {
				className: r("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"),
				onClick: () => u("csv"),
				title: d.downloadTableAsCsv,
				type: "button",
				children: d.tableFormatCsv
			}), (0, import_jsx_runtime.jsx)("button", {
				className: r("w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"),
				onClick: () => u("markdown"),
				title: d.downloadTableAsMarkdown,
				type: "button",
				children: d.tableFormatMarkdown
			})]
		}) : null]
	});
};
var Wo = ({ children: e, className: t, showCopy: o = true, showDownload: n = true }) => {
	let { Maximize2Icon: r, XIcon: s } = H(), a = C(), [l, i] = (0, import_react.useState)(false), { isAnimating: c } = (0, import_react.useContext)(S), d = B(), p = () => {
		i(true);
	}, m = () => {
		i(false);
	};
	return (0, import_react.useEffect)(() => {
		if (l) {
			be();
			let u = (f) => {
				f.key === "Escape" && i(false);
			};
			return document.addEventListener("keydown", u), () => {
				document.removeEventListener("keydown", u), he();
			};
		}
	}, [l]), (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)("button", {
		className: a("cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50", t),
		disabled: c,
		onClick: p,
		title: d.viewFullscreen,
		type: "button",
		children: (0, import_jsx_runtime.jsx)(r, { size: 14 })
	}), l ? (0, import_react_dom.createPortal)((0, import_jsx_runtime.jsx)("div", {
		"aria-label": d.viewFullscreen,
		"aria-modal": "true",
		className: a("fixed inset-0 z-50 flex flex-col bg-background"),
		"data-streamdown": "table-fullscreen",
		onClick: m,
		onKeyDown: (u) => {
			u.key === "Escape" && m();
		},
		role: "dialog",
		children: (0, import_jsx_runtime.jsxs)("div", {
			className: a("flex h-full flex-col"),
			"data-streamdown": "table-wrapper",
			onClick: (u) => u.stopPropagation(),
			onKeyDown: (u) => u.stopPropagation(),
			role: "presentation",
			children: [(0, import_jsx_runtime.jsxs)("div", {
				className: a("flex items-center justify-end gap-1 p-4"),
				children: [
					o ? (0, import_jsx_runtime.jsx)(Le, {}) : null,
					n ? (0, import_jsx_runtime.jsx)(De, {}) : null,
					(0, import_jsx_runtime.jsx)("button", {
						className: a("rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"),
						onClick: m,
						title: d.exitFullscreen,
						type: "button",
						children: (0, import_jsx_runtime.jsx)(s, { size: 20 })
					})
				]
			}), (0, import_jsx_runtime.jsx)("div", {
				className: a("flex-1 overflow-auto p-4 pt-0 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10"),
				children: (0, import_jsx_runtime.jsx)("table", {
					className: a("w-full border-collapse border border-border"),
					"data-streamdown": "table",
					children: e
				})
			})]
		})
	}), document.body) : null] });
};
var Xo = ({ children: e, className: t, maxHeight: o, showControls: n, showCopy: r = true, showDownload: s = true, showFullscreen: a = true, ...l }) => {
	let i = C(), { isAnimating: c } = (0, import_react.useContext)(S), d = ze(o), p = $e(c, !!d, e), m = n && r, u = n && s, f = n && a, b = m || u || f;
	return (0, import_jsx_runtime.jsxs)("div", {
		className: i("my-4 flex flex-col gap-2 rounded-lg border border-border bg-sidebar p-2"),
		"data-streamdown": "table-wrapper",
		children: [b ? (0, import_jsx_runtime.jsxs)("div", {
			className: i("flex items-center justify-end gap-1"),
			children: [
				m ? (0, import_jsx_runtime.jsx)(Le, {}) : null,
				u ? (0, import_jsx_runtime.jsx)(De, {}) : null,
				f ? (0, import_jsx_runtime.jsx)(Wo, {
					showCopy: m,
					showDownload: u,
					children: e
				}) : null
			]
		}) : null, (0, import_jsx_runtime.jsx)("div", {
			className: i("border-collapse overflow-x-auto overflow-y-auto rounded-md border border-border bg-background"),
			ref: p,
			style: d ? { maxHeight: d } : void 0,
			children: (0, import_jsx_runtime.jsx)("table", {
				className: i("w-full divide-y divide-border", t),
				"data-streamdown": "table",
				...l,
				children: e
			})
		})]
	});
};
var Fs = /startLine=(\d+)/;
var js = /\bnoLineNumbers\b/;
var _s = (0, import_react.lazy)(() => Promise.resolve().then(() => mermaid_HWGCJPDP_exports).then((e) => ({ default: e.Mermaid })));
var zs = /language-([^\s]+)/;
var $s = "node";
function D(e, t) {
	let o = Object.keys(e);
	if (o.length !== Object.keys(t).length) return false;
	let n = e, r = t;
	for (let s of o) if (s !== $s && !Object.is(n[s], r[s])) return false;
	return true;
}
function qs(e, t) {
	var o, n;
	return ((o = e == null ? void 0 : e.properties) == null ? void 0 : o.metastring) === ((n = t == null ? void 0 : t.properties) == null ? void 0 : n.metastring);
}
var Qe = (e, t) => typeof e == "boolean" ? e : e[t] !== false;
var Ht = (e, t) => {
	if (typeof e == "boolean") return e;
	let o = e.table;
	return o === false ? false : o === true || o === void 0 ? true : o[t] !== false;
};
var Jo = (e, t) => {
	if (typeof e == "boolean") return e;
	let o = e.code;
	return o === false ? false : o === true || o === void 0 ? true : o[t] !== false;
};
var Ge = (e, t) => {
	if (typeof e == "boolean") return e;
	let o = e.mermaid;
	return o === false ? false : o === true || o === void 0 ? true : o[t] !== false;
};
var Ws = (e, t) => {
	if (typeof e == "boolean") return e;
	let o = e.image;
	return o === false ? false : o === true || o === void 0 ? true : o[t] !== false;
};
var Bt = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("ol", {
		className: r("list-inside list-decimal whitespace-normal [li_&]:pl-6", t),
		"data-streamdown": "ordered-list",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
Bt.displayName = "MarkdownOl";
var Uo = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("li", {
		className: r("py-1 [&>p]:inline", t),
		"data-streamdown": "list-item",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
Uo.displayName = "MarkdownLi";
var Go = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("ul", {
		className: r("list-inside list-disc whitespace-normal [li_&]:pl-6", t),
		"data-streamdown": "unordered-list",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
Go.displayName = "MarkdownUl";
var Yo = (0, import_react.memo)(({ className: e, node: t, ...o }) => {
	let n = C();
	return (0, import_jsx_runtime.jsx)("hr", {
		className: n("my-6 border-border", e),
		"data-streamdown": "horizontal-rule",
		...o
	});
}, (e, t) => D(e, t));
Yo.displayName = "MarkdownHr";
var Qo = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("span", {
		className: r("font-semibold", t),
		"data-streamdown": "strong",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
Qo.displayName = "MarkdownStrong";
var Zs = ({ children: e, className: t, href: o, node: n, ...r }) => {
	let s = C(), { linkSafety: a } = (0, import_react.useContext)(S), [l, i] = (0, import_react.useState)(false), c = o === "streamdown:incomplete-link", d = (0, import_react.useCallback)(async (f) => {
		if (!(!(a != null && a.enabled && o) || c)) {
			if (f.preventDefault(), a.onLinkCheck && await a.onLinkCheck(o)) {
				window.open(o, "_blank", "noreferrer");
				return;
			}
			i(true);
		}
	}, [
		a,
		o,
		c
	]), p = (0, import_react.useCallback)(() => {
		o && window.open(o, "_blank", "noreferrer");
	}, [o]), m = (0, import_react.useCallback)(() => {
		i(false);
	}, []), u = {
		url: o != null ? o : "",
		isOpen: l,
		onClose: m,
		onConfirm: p
	};
	return a != null && a.enabled && o ? (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)("button", {
		className: s("wrap-anywhere appearance-none text-left font-medium text-primary underline", t),
		"data-incomplete": c,
		"data-streamdown": "link",
		onClick: d,
		type: "button",
		children: e
	}), a.renderModal ? a.renderModal(u) : (0, import_jsx_runtime.jsx)(Lo, { ...u })] }) : (0, import_jsx_runtime.jsx)("a", {
		className: s("wrap-anywhere font-medium text-primary underline", t),
		"data-incomplete": c,
		"data-streamdown": "link",
		href: o,
		rel: "noreferrer",
		target: "_blank",
		...r,
		children: e
	});
};
var en = (0, import_react.memo)(Zs, (e, t) => D(e, t));
en.displayName = "MarkdownA";
var tn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("h1", {
		className: r("mt-6 mb-2 font-semibold text-3xl", t),
		"data-streamdown": "heading-1",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
tn.displayName = "MarkdownH1";
var on = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("h2", {
		className: r("mt-6 mb-2 font-semibold text-2xl", t),
		"data-streamdown": "heading-2",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
on.displayName = "MarkdownH2";
var nn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("h3", {
		className: r("mt-6 mb-2 font-semibold text-xl", t),
		"data-streamdown": "heading-3",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
nn.displayName = "MarkdownH3";
var rn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("h4", {
		className: r("mt-6 mb-2 font-semibold text-lg", t),
		"data-streamdown": "heading-4",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
rn.displayName = "MarkdownH4";
var sn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("h5", {
		className: r("mt-6 mb-2 font-semibold text-base", t),
		"data-streamdown": "heading-5",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
sn.displayName = "MarkdownH5";
var an = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("h6", {
		className: r("mt-6 mb-2 font-semibold text-sm", t),
		"data-streamdown": "heading-6",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
an.displayName = "MarkdownH6";
var ln = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let { controls: r, tableMaxHeight: s } = (0, import_react.useContext)(S), a = Qe(r, "table"), l = Ht(r, "copy"), i = Ht(r, "download"), c = Ht(r, "fullscreen");
	return (0, import_jsx_runtime.jsx)(Xo, {
		className: t,
		maxHeight: s,
		showControls: a,
		showCopy: l,
		showDownload: i,
		showFullscreen: c,
		...n,
		children: e
	});
}, (e, t) => D(e, t));
ln.displayName = "MarkdownTable";
var cn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("thead", {
		className: r("bg-muted/80", t),
		"data-streamdown": "table-header",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
cn.displayName = "MarkdownThead";
var dn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("tbody", {
		className: r("divide-y divide-border", t),
		"data-streamdown": "table-body",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
dn.displayName = "MarkdownTbody";
var mn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("tr", {
		className: r("border-border", t),
		"data-streamdown": "table-row",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
mn.displayName = "MarkdownTr";
var un = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("th", {
		className: r("whitespace-nowrap px-4 py-2 text-left font-semibold text-sm", t),
		"data-streamdown": "table-header-cell",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
un.displayName = "MarkdownTh";
var pn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("td", {
		className: r("px-4 py-2 text-sm", t),
		"data-streamdown": "table-cell",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
pn.displayName = "MarkdownTd";
var fn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("blockquote", {
		className: r("my-4 border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic", t),
		"data-streamdown": "blockquote",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
fn.displayName = "MarkdownBlockquote";
var gn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("sup", {
		className: r("text-sm", t),
		"data-streamdown": "superscript",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
gn.displayName = "MarkdownSup";
var bn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	let r = C();
	return (0, import_jsx_runtime.jsx)("sub", {
		className: r("text-sm", t),
		"data-streamdown": "subscript",
		...n,
		children: e
	});
}, (e, t) => D(e, t));
bn.displayName = "MarkdownSub";
var hn = (0, import_react.memo)(({ children: e, className: t, node: o, ...n }) => {
	if ("data-footnotes" in n) {
		let s = (i) => {
			var m, u;
			if (!(0, import_react.isValidElement)(i)) return false;
			let c = Array.isArray(i.props.children) ? i.props.children : [i.props.children], d = false, p = false;
			for (let f of c) if (f) {
				if (typeof f == "string") f.trim() !== "" && (d = true);
				else if ((0, import_react.isValidElement)(f)) if (((m = f.props) == null ? void 0 : m["data-footnote-backref"]) !== void 0) p = true;
				else {
					let b = Array.isArray(f.props.children) ? f.props.children : [f.props.children];
					for (let w of b) {
						if (typeof w == "string" && w.trim() !== "") {
							d = true;
							break;
						}
						if ((0, import_react.isValidElement)(w) && ((u = w.props) == null ? void 0 : u["data-footnote-backref"]) === void 0) {
							d = true;
							break;
						}
					}
				}
			}
			return p && !d;
		}, a = Array.isArray(e) ? e.map((i) => {
			if (!(0, import_react.isValidElement)(i)) return i;
			if (i.type === Bt) {
				let d = (Array.isArray(i.props.children) ? i.props.children : [i.props.children]).filter((p) => !s(p));
				return d.length === 0 ? null : {
					...i,
					props: {
						...i.props,
						children: d
					}
				};
			}
			return i;
		}) : e;
		return (Array.isArray(a) ? a.some((i) => i !== null) : a !== null) ? (0, import_jsx_runtime.jsx)("section", {
			className: t,
			...n,
			children: a
		}) : null;
	}
	return (0, import_jsx_runtime.jsx)("section", {
		className: t,
		...n,
		children: e
	});
}, (e, t) => D(e, t));
hn.displayName = "MarkdownSection";
var Xs = ({ node: e, className: t, children: o, ...n }) => {
	var q, _;
	let r = C(), s = !("data-block" in n), { mermaid: a, controls: l, lineNumbers: i } = (0, import_react.useContext)(S), c = ye(), d = ht(), p = t == null ? void 0 : t.match(zs), m = (q = p == null ? void 0 : p.at(1)) != null ? q : "", u = Do(m);
	if (s) return (0, import_jsx_runtime.jsx)("code", {
		className: r("rounded bg-muted px-1.5 py-0.5 font-mono text-sm", t),
		"data-streamdown": "inline-code",
		...n,
		children: o
	});
	let f = (_ = e == null ? void 0 : e.properties) == null ? void 0 : _.metastring, b = f == null ? void 0 : f.match(Fs), w = b ? Number.parseInt(b[1], 10) : void 0, y = w !== void 0 && w >= 1 ? w : void 0, g = !(f ? js.test(f) : false) && i !== false, x = "";
	if ((0, import_react.isValidElement)(o) && o.props && typeof o.props == "object" && "children" in o.props && typeof o.props.children == "string" ? x = o.props.children : typeof o == "string" && (x = o), u) {
		let W = u.component;
		return (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: (0, import_jsx_runtime.jsx)(Xe, {}),
			children: (0, import_jsx_runtime.jsx)(W, {
				code: x,
				isIncomplete: d,
				language: m,
				meta: f
			})
		});
	}
	if (m === "mermaid" && c) {
		let W = Qe(l, "mermaid"), X = Ge(l, "download"), K = Ge(l, "copy"), j = Ge(l, "fullscreen"), O = Ge(l, "panZoom"), P = W && (X || K || j);
		return (0, import_jsx_runtime.jsx)(import_react.Suspense, {
			fallback: (0, import_jsx_runtime.jsx)(Xe, {}),
			children: (0, import_jsx_runtime.jsxs)("div", {
				className: r("group relative my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2", t),
				"data-streamdown": "mermaid-block",
				children: [
					(0, import_jsx_runtime.jsx)("div", {
						className: r("flex h-8 items-center text-muted-foreground text-xs"),
						children: (0, import_jsx_runtime.jsx)("span", {
							className: r("ml-1 font-mono lowercase"),
							children: "mermaid"
						})
					}),
					P ? (0, import_jsx_runtime.jsx)("div", {
						className: r("pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end"),
						children: (0, import_jsx_runtime.jsxs)("div", {
							className: r("pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur"),
							"data-streamdown": "mermaid-block-actions",
							children: [
								X ? (0, import_jsx_runtime.jsx)(Je, {
									chart: x,
									config: a == null ? void 0 : a.config
								}) : null,
								K ? (0, import_jsx_runtime.jsx)(ge, { code: x }) : null,
								j ? (0, import_jsx_runtime.jsx)(Fo, {
									chart: x,
									config: a == null ? void 0 : a.config
								}) : null
							]
						})
					}) : null,
					(0, import_jsx_runtime.jsx)("div", {
						className: r("rounded-md border border-border bg-background"),
						children: (0, import_jsx_runtime.jsx)(_s, {
							chart: x,
							config: a == null ? void 0 : a.config,
							showControls: O
						})
					})
				]
			})
		});
	}
	let I = Qe(l, "code"), N = Jo(l, "download"), T = Jo(l, "copy"), { "data-block": M, ...E } = n;
	return (0, import_jsx_runtime.jsx)(Tt, {
		className: t,
		code: x,
		isIncomplete: d,
		language: m,
		lineNumbers: g,
		startLine: y,
		...E,
		children: I ? (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [N ? (0, import_jsx_runtime.jsx)(It, {
			code: x,
			language: m
		}) : null, T ? (0, import_jsx_runtime.jsx)(ge, {}) : null] }) : null
	});
};
var yn = (0, import_react.memo)(Xs, (e, t) => D(e, t) && qs(e.node, t.node));
yn.displayName = "MarkdownCode";
var Ks = ({ node: e, className: t, ...o }) => {
	let { controls: n } = (0, import_react.useContext)(S), r = Qe(n, "image"), s = r && Ws(n, "download");
	return (0, import_jsx_runtime.jsx)(So, {
		className: t,
		node: e,
		showControls: r,
		showDownloadControl: s,
		...o
	});
};
var wn = (0, import_react.memo)(Ks, (e, t) => D(e, t));
wn.displayName = "MarkdownImg";
var Cn = (0, import_react.memo)(({ children: e, node: t, ...o }) => {
	let r = (Array.isArray(e) ? e : [e]).filter((s) => s != null && s !== "");
	if (r.length === 1 && (0, import_react.isValidElement)(r[0])) {
		let s = r[0].props.node, a = s == null ? void 0 : s.tagName;
		if (a === "img") return (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: e });
		if (a === "code" && "data-block" in r[0].props) return (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: e });
	}
	return (0, import_jsx_runtime.jsx)("p", {
		...o,
		children: e
	});
}, (e, t) => D(e, t));
Cn.displayName = "MarkdownParagraph";
var xn = {
	ol: Bt,
	li: Uo,
	ul: Go,
	hr: Yo,
	strong: Qo,
	a: en,
	h1: tn,
	h2: on,
	h3: nn,
	h4: rn,
	h5: sn,
	h6: an,
	table: ln,
	thead: cn,
	tbody: dn,
	tr: mn,
	th: un,
	td: pn,
	blockquote: fn,
	code: yn,
	img: wn,
	pre: ({ children: e }) => (0, import_react.isValidElement)(e) ? (0, import_react.cloneElement)(e, { "data-block": "true" }) : e,
	sup: gn,
	sub: bn,
	p: Cn,
	section: hn
};
var Js = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
var Us = /\p{L}/u;
function He(e) {
	let t = e.replace(/(```|~~~)[\s\S]*?\1/g, "").replace(/^#{1,6}\s+/gm, "").replace(/(\*{1,3}|_{1,3})/g, "").replace(/`[^`]*`/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/^[\s>*\-+\d.]+/gm, ""), o, n = 0, r = 0;
	for (let s of t) {
		if (Js.test(s)) {
			o ??= "rtl", r += 1;
			continue;
		}
		Us.test(s) && (o ??= "ltr", n += 1);
	}
	return r > n ? "rtl" : n > r ? "ltr" : o != null ? o : "ltr";
}
var Gs = /^[ \t]{0,3}(`{3,}|~{3,})/;
var Ys = /^\|?[ \t]*:?-{1,}:?[ \t]*(\|[ \t]*:?-{1,}:?[ \t]*)*\|?$/;
var Ot = (e) => {
	let t = e.split(`
`), o = null, n = 0;
	for (let r of t) {
		let s = Gs.exec(r);
		if (o === null) {
			if (s) {
				let a = s[1];
				o = a[0], n = a.length;
			}
		} else if (s) {
			let a = s[1], l = a[0], i = a.length;
			l === o && i >= n && (o = null, n = 0);
		}
	}
	return o !== null;
};
var kn = (e) => {
	let t = e.split(`
`);
	for (let o of t) {
		let n = o.trim();
		if (n.length > 0 && n.includes("|") && Ys.test(n)) return true;
	}
	return false;
};
var vn = () => (e) => {
	visit(e, "html", (t, o, n) => {
		!n || typeof o != "number" || (n.children[o] = {
			type: "text",
			value: t.value
		});
	});
};
var Pn = [];
var Mn = { allowDangerousHtml: true };
var ot = /* @__PURE__ */ new WeakMap();
var Ft = class {
	constructor() {
		this.cache = /* @__PURE__ */ new Map();
		this.keyCache = /* @__PURE__ */ new WeakMap();
		this.maxSize = 100;
	}
	generateCacheKey(t) {
		let o = this.keyCache.get(t);
		if (o) return o;
		let n = t.rehypePlugins, r = t.remarkPlugins, s = t.remarkRehypeOptions;
		if (!(n || r || s)) {
			let p = "default";
			return this.keyCache.set(t, p), p;
		}
		let a = (p) => {
			if (!p || p.length === 0) return "";
			let m = "";
			for (let u = 0; u < p.length; u += 1) {
				let f = p[u];
				if (u > 0 && (m += ","), Array.isArray(f)) {
					let [b, w] = f;
					if (typeof b == "function") {
						let y = ot.get(b);
						y || (y = b.name, ot.set(b, y)), m += y;
					} else m += String(b);
					m += ":", m += JSON.stringify(w);
				} else if (typeof f == "function") {
					let b = ot.get(f);
					b || (b = f.name, ot.set(f, b)), m += b;
				} else m += String(f);
			}
			return m;
		}, l = a(n), d = `${a(r)}::${l}::${s ? JSON.stringify(s) : ""}`;
		return this.keyCache.set(t, d), d;
	}
	get(t) {
		let o = this.generateCacheKey(t), n = this.cache.get(o);
		return n && (this.cache.delete(o), this.cache.set(o, n)), n;
	}
	set(t, o) {
		let n = this.generateCacheKey(t);
		if (this.cache.size >= this.maxSize) {
			let r = this.cache.keys().next().value;
			r && this.cache.delete(r);
		}
		this.cache.set(n, o);
	}
	clear() {
		this.cache.clear();
	}
};
var In = new Ft();
var jt = (e) => {
	let t = la(e), o = e.children || "";
	return fa(t.runSync(t.parse(o), o), e);
};
var la = (e) => {
	let t = In.get(e);
	if (t) return t;
	let o = da(e);
	return In.set(e, o), o;
};
var ca = (e) => e.some((t) => Array.isArray(t) ? t[0] === rehypeRaw : t === rehypeRaw);
var da = (e) => {
	let t = e.rehypePlugins || Pn, o = e.remarkPlugins || Pn, n = ca(t) ? o : [...o, vn], r = e.remarkRehypeOptions ? {
		...Mn,
		...e.remarkRehypeOptions
	} : Mn;
	return unified().use(remarkParse).use(n).use(remarkRehype, r).use(t);
};
var Nn = (e) => e;
var ma = (e, t, o, n) => {
	o ? e.children.splice(t, 1) : e.children[t] = {
		type: "text",
		value: n
	};
};
var ua = (e, t) => {
	var o;
	for (let n in urlAttributes) if (Object.hasOwn(urlAttributes, n) && Object.hasOwn(e.properties, n)) {
		let r = e.properties[n], s = urlAttributes[n];
		(s === null || s.includes(e.tagName)) && (e.properties[n] = (o = t(String(r || ""), n, e)) != null ? o : void 0);
	}
};
var pa = (e, t, o, n, r, s) => {
	let a = false;
	return n ? a = !n.includes(e.tagName) : r && (a = r.includes(e.tagName)), !a && s && typeof t == "number" && (a = !s(e, t, o)), a;
};
var fa = (e, t) => {
	let { allowElement: o, allowedElements: n, disallowedElements: r, skipHtml: s, unwrapDisallowed: a, urlTransform: l } = t;
	if (o || n || r || s || l) {
		let c = l || Nn;
		visit(e, (d, p, m) => {
			if (d.type === "raw" && m && typeof p == "number") return ma(m, p, s, d.value), p;
			if (d.type === "element" && (ua(d, c), pa(d, p, m, n, r, o) && m && typeof p == "number")) return a && d.children ? m.children.splice(p, 1, ...d.children) : m.children.splice(p, 1), p;
		});
	}
	return toJsxRuntime(e, {
		Fragment: import_jsx_runtime.Fragment,
		components: t.components,
		ignoreInvalidStyle: true,
		jsx: import_jsx_runtime.jsx,
		jsxs: import_jsx_runtime.jsxs,
		passKeys: true,
		passNode: true
	});
};
var ba = /\[\^[\w-]{1,200}\](?!:)/;
var ha = /\[\^[\w-]{1,200}\]:/;
var ya = /<([A-Za-z][\w:-]*)[\s>/]/;
var wa = /* @__PURE__ */ new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);
var Sn = /* @__PURE__ */ new Map();
var Rn = /* @__PURE__ */ new Map();
var Ca = (e) => {
	let t = e.toLowerCase(), o = Sn.get(t);
	if (o) return o;
	let n = new RegExp(`<${t}(?=[\\s>/])[^>]*>`, "gi");
	return Sn.set(t, n), n;
};
var xa = (e) => {
	let t = e.toLowerCase(), o = Rn.get(t);
	if (o) return o;
	let n = new RegExp(`</${t}(?=[\\s>])[^>]*>`, "gi");
	return Rn.set(t, n), n;
};
var En = (e, t) => {
	if (wa.has(t.toLowerCase())) return 0;
	let o = e.match(Ca(t));
	if (!o) return 0;
	let n = 0;
	for (let r of o) r.trimEnd().endsWith("/>") || (n += 1);
	return n;
};
var Ln = (e, t) => {
	let o = e.match(xa(t));
	return o ? o.length : 0;
};
var ka = (e) => {
	let t = 0;
	for (let o = 0; o < e.length - 1; o += 1) e[o] === "$" && e[o + 1] === "$" && (t += 1, o += 1);
	return t;
};
var _t = (e) => {
	let t = ba.test(e), o = ha.test(e);
	if (t || o) return [e];
	let n = x$1.lex(e, { gfm: true }), r = [], s = [], a = false;
	for (let l of n) {
		let i = l.raw, c = r.length;
		if (s.length > 0) {
			r[c - 1] += i;
			let d = s.at(-1), p = En(i, d), m = Ln(i, d);
			for (let u = 0; u < p; u += 1) s.push(d);
			for (let u = 0; u < m; u += 1) s.length > 0 && s.at(-1) === d && s.pop();
			continue;
		}
		if (l.type === "html" && l.block) {
			let d = i.match(ya);
			if (d) {
				let p = d[1];
				En(i, p) > Ln(i, p) && s.push(p);
			}
		}
		if (c > 0 && !a) {
			let d = r[c - 1];
			if (ka(d) % 2 === 1) {
				r[c - 1] = d + i;
				continue;
			}
		}
		r.push(i), l.type !== "space" && (a = l.type === "code");
	}
	return r;
};
var va = /^\n*/;
var Ta = /\n*$/;
var zt = /\n\n/g;
var Pa = (e, t, o) => {
	if (!t.includes(`
`)) return e + t + o;
	return `${e}${t.replace(zt, `
<!---->
`).replace(va, `

`).replace(Ta, `

`)}${o}

`;
};
var Ma = (e, t) => {
	let o = new RegExp(`<(${t})(?=[\\s>/])([^>]*)>`, "gi"), n = "", r = 0, s = o.exec(e);
	for (; s;) {
		let a = s[0], l = s[1], i = s.index + a.length, c = e.slice(i);
		if (new RegExp(`</${l}\\s*>`, "i").test(c)) {
			s = o.exec(e);
			continue;
		}
		if (n += e.slice(r, s.index), c.length === 0) {
			n += a, r = i, s = o.exec(e);
			continue;
		}
		if (c.startsWith(`

`)) {
			let u = c.slice(2).replace(zt, `
<!---->
`);
			n += `${a}

${u}`, r = e.length;
			break;
		}
		if (!c.startsWith(`
`)) {
			n += a, r = i, s = o.exec(e);
			continue;
		}
		let p = c.slice(1);
		if (p.trim().length === 0) {
			n += a, r = i, s = o.exec(e);
			continue;
		}
		let m = p.replace(zt, `
<!---->
`);
		n += `${a}

${m}`, r = e.length;
		break;
	}
	return r === 0 ? e : n + e.slice(r);
};
var Dn = (e, t) => {
	if (!t.length) return e;
	let o = e;
	for (let n of t) {
		let r = new RegExp(`(<${n}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${n}\\s*>)`, "gi");
		o = o.replace(r, (s, a, l, i) => Pa(a, l, i)), o = Ma(o, n);
	}
	return o;
};
var Ia = /([\\`*_~[\]|])/g;
var Na = (e) => e.replace(Ia, "\\$1");
var An = (e, t) => {
	if (!t.length) return e;
	let o = e;
	for (let n of t) {
		let r = new RegExp(`(<${n}(?=[\\s>/])[^>]*>)([\\s\\S]*?)(</${n}\\s*>)`, "gi");
		o = o.replace(r, (s, a, l, i) => {
			return a + Na(l).replace(/\n\n/g, "&#10;&#10;") + i;
		});
	}
	return o;
};
var Ra = /* @__PURE__ */ new Set([
	"blockquote",
	"dd",
	"dt",
	"figcaption",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"li",
	"p",
	"td",
	"th"
]);
var Hn = /* @__PURE__ */ new Set([
	"code",
	"kbd",
	"pre",
	"samp",
	"var"
]);
function Bn(e) {
	return e.children.map((t) => t.type === "text" ? t.value : t.type === "element" && !Hn.has(t.tagName) ? Bn(t) : "").join("");
}
function On() {
	return (e) => {
		visit(e, "element", (t) => {
			if (Hn.has(t.tagName)) {
				t.properties ??= {}, t.properties.dir = "ltr";
				return;
			}
			Ra.has(t.tagName) && (t.properties ??= {}, typeof t.properties.dir != "string" && (t.properties.dir = He(Bn(t))));
		});
	};
}
var Vn = (e) => e.type === "text" ? e.value : "children" in e && Array.isArray(e.children) ? e.children.map(Vn).join("") : "";
var Fn = (e) => (t) => {
	if (!e || e.length === 0) return;
	let o = new Set(e.map((n) => n.toLowerCase()));
	visit(t, "element", (n) => {
		if (o.has(n.tagName.toLowerCase())) {
			let r = Vn(n);
			n.children = r ? [{
				type: "text",
				value: r
			}] : [];
		}
	});
};
var jn = () => (e) => {
	visit(e, "code", (t) => {
		var o, n;
		t.meta && (t.data = (o = t.data) != null ? o : {}, t.data.hProperties = {
			...(n = t.data.hProperties) != null ? n : {},
			metastring: t.meta
		});
	});
};
var ja = /^[ \t]*<[\w!/?-]/;
var _a = /(^|\n)[ \t]{4,}(?=<[\w!/?-])/g;
var za = (e) => typeof e != "string" || e.length === 0 || !ja.test(e) ? e : e.replace(_a, "$1");
var $n;
var qn;
var Wn;
var Zn;
var nt = {
	...defaultSchema,
	clobberPrefix: "",
	protocols: {
		...defaultSchema.protocols,
		href: [
			...(qn = ($n = defaultSchema.protocols) == null ? void 0 : $n.href) != null ? qn : [],
			"tel",
			"streamdown"
		]
	},
	attributes: {
		...defaultSchema.attributes,
		code: [...(Zn = (Wn = defaultSchema.attributes) == null ? void 0 : Wn.code) != null ? Zn : [], "metastring"]
	}
};
var $t = {
	raw: rehypeRaw,
	sanitize: [rehypeSanitize, nt],
	harden: [harden, {
		allowedImagePrefixes: ["*"],
		allowedLinkPrefixes: ["*"],
		allowedProtocols: ["*"],
		defaultOrigin: void 0,
		allowDataImages: true
	}]
};
var $a = {
	gfm: [remarkGfm, {}],
	codeMeta: jn
};
var zn = Object.values($t);
var qa = Object.values($a);
var Wa = {
	block: " ▋",
	circle: " ●"
};
var Un = ["github-light", "github-dark"];
var Gn = { enabled: true };
var S = (0, import_react.createContext)({
	codeBlockMaxHeight: 400,
	shikiTheme: Un,
	controls: true,
	isAnimating: false,
	lineNumbers: true,
	mode: "streaming",
	mermaid: void 0,
	linkSafety: Gn,
	tableMaxHeight: 300
});
var Yn = (0, import_react.memo)(({ content: e, shouldParseIncompleteMarkdown: t, shouldNormalizeHtmlIndentation: o, index: n, isIncomplete: r, dir: s, animatePlugin: a, ...l }) => {
	(0, import_react.useLayoutEffect)(() => {
		a?.commit();
	});
	let i = typeof e == "string" && o ? za(e) : e, c = (0, import_jsx_runtime.jsx)(jt, {
		...l,
		children: i
	});
	return (0, import_jsx_runtime.jsx)(bt.Provider, {
		value: r,
		children: s ? (0, import_jsx_runtime.jsx)("div", {
			dir: s,
			style: { display: "contents" },
			children: c
		}) : c
	});
}, (e, t) => {
	if (e.content !== t.content || e.shouldNormalizeHtmlIndentation !== t.shouldNormalizeHtmlIndentation || e.index !== t.index || e.isIncomplete !== t.isIncomplete || e.dir !== t.dir) return false;
	if (e.components !== t.components) {
		let o = Object.keys(e.components || {}), n = Object.keys(t.components || {});
		if (o.length !== n.length || o.some((r) => {
			var s, a;
			return ((s = e.components) == null ? void 0 : s[r]) !== ((a = t.components) == null ? void 0 : a[r]);
		})) return false;
	}
	return !(e.rehypePlugins !== t.rehypePlugins || e.remarkPlugins !== t.remarkPlugins || !!e.animatePlugin != !!t.animatePlugin);
});
Yn.displayName = "Block";
var Xa = (0, import_react.memo)(({ children: e, mode: t = "streaming", dir: o, parseIncompleteMarkdown: n = true, normalizeHtmlIndentation: r = false, components: s, rehypePlugins: a = zn, remarkPlugins: l = qa, className: i, shikiTheme: c, mermaid: d, codeBlockMaxHeight: p = 400, controls: m = true, isAnimating: u = false, tableMaxHeight: f = 300, animated: b, BlockComponent: w = Yn, parseMarkdownIntoBlocksFn: y = _t, caret: h, plugins: g, remend: x, linkSafety: I = Gn, lineNumbers: N = true, allowedTags: T, literalTagContent: M, translations: E, icons: q, prefix: _, onAnimationStart: W, onAnimationEnd: X, ...K }) => {
	let j = (0, import_react.useId)(), O = (0, import_react.useMemo)(() => lo(_), [_]), P = (0, import_react.useRef)(null), V = (0, import_react.useRef)(W), re = (0, import_react.useRef)(X);
	V.current = W, re.current = X, (0, import_react.useEffect)(() => {
		var A, Z, Q;
		if (t === "static") return;
		let k = P.current;
		if (P.current = u, k === null) {
			u && ((A = V.current) == null || A.call(V));
			return;
		}
		u && !k ? (Z = V.current) == null || Z.call(V) : !u && k && ((Q = re.current) == null || Q.call(re));
	}, [u, t]);
	let st = (0, import_react.useMemo)(() => T ? Object.keys(T) : [], [T]), at = (0, import_react.useMemo)(() => {
		if (typeof e != "string") return "";
		let k = t === "streaming" && n ? We$1(e, x) : e;
		return M && M.length > 0 && (k = An(k, M)), st.length > 0 && (k = Dn(k, st)), k;
	}, [
		e,
		t,
		n,
		x,
		st,
		M
	]), G = (0, import_react.useMemo)(() => y(at), [at, y]), it = (0, import_react.useMemo)(() => o === "auto" ? G.map(He) : void 0, [G, o]), nr = (0, import_react.useMemo)(() => G.map((k, A) => `${j}-${A}`), [G.length, j]), ue = (0, import_react.useMemo)(() => b === true ? "true" : b ? JSON.stringify(b) : "", [b]), Y = (0, import_react.useRef)(null), ke = (0, import_react.useRef)([]), se = (0, import_react.useRef)([]), qt = (0, import_react.useRef)(null), lt = (0, import_react.useRef)("");
	if (ue) {
		if (lt.current !== ue) {
			lt.current = ue;
			Y.current = pt({ maxBacklogMs: ue !== "true" ? b.maxBacklogMs : void 0 }), ke.current = [], se.current = [];
		} else Y.current || (Y.current = pt());
		u && Y.current && Y.current.beginPass(Y.current.now());
	} else Y.current = null, ke.current = [], se.current = [], lt.current = "";
	(0, import_react.useLayoutEffect)(() => {
		var k;
		u && ((k = Y.current) == null || k.commitPass());
	});
	let Wt = (0, import_react.useMemo)(() => {
		var k, A;
		return {
			codeBlockMaxHeight: p,
			shikiTheme: (A = c != null ? c : (k = g == null ? void 0 : g.code) == null ? void 0 : k.getThemes()) != null ? A : Un,
			controls: m,
			isAnimating: u,
			lineNumbers: N,
			mode: t,
			mermaid: d,
			linkSafety: I,
			tableMaxHeight: f
		};
	}, [
		p,
		c,
		m,
		u,
		N,
		t,
		d,
		I,
		g == null ? void 0 : g.code,
		f
	]), rr = (0, import_react.useMemo)(() => E ? JSON.stringify(E) : "", [E]), Zt = (0, import_react.useMemo)(() => ({
		...We,
		...E
	}), [rr]), Xt = (0, import_react.useMemo)(() => {
		let { inlineCode: k, ...A } = s != null ? s : {}, Z = {
			...xn,
			...A
		};
		if (k) {
			let Q = Z.code;
			Z.code = (pe) => "data-block" in pe ? Q ? (0, import_react.createElement)(Q, pe) : null : (0, import_react.createElement)(k, pe);
		}
		return Z;
	}, [s]), Kt = (0, import_react.useMemo)(() => {
		let k = [];
		return g != null && g.cjk && (k = [...k, ...g.cjk.remarkPluginsBefore]), k = [...k, ...l], g != null && g.cjk && (k = [...k, ...g.cjk.remarkPluginsAfter]), g != null && g.math && (k = [...k, g.math.remarkPlugin]), k;
	}, [
		l,
		g == null ? void 0 : g.math,
		g == null ? void 0 : g.cjk
	]), ve = (0, import_react.useMemo)(() => {
		var A;
		let k = a;
		if (T && Object.keys(T).length > 0 && a === zn) {
			let Z = {
				...nt,
				tagNames: [...(A = nt.tagNames) != null ? A : [], ...Object.keys(T)],
				attributes: {
					...nt.attributes,
					...T
				}
			};
			k = [
				$t.raw,
				[rehypeSanitize, Z],
				$t.harden
			];
		}
		return M && M.length > 0 && (k = [...k, [Fn, M]]), g != null && g.math && (k = [...k, g.math.rehypePlugin]), o === "auto" && t === "static" && (k = [...k, On]), k;
	}, [
		a,
		g == null ? void 0 : g.math,
		T,
		M,
		o,
		t
	]), ct = (0, import_react.useMemo)(() => {
		if (!u || G.length === 0) return false;
		let k = G.at(-1);
		return Ot(k) || kn(k);
	}, [u, G]), sr = (0, import_react.useMemo)(() => h && u && !ct ? { "--streamdown-caret": `"${Wa[h]}"` } : void 0, [
		h,
		u,
		ct
	]), ar = (k) => {
		let A = null;
		if (Y.current && u) {
			if (!ke.current[k]) {
				let { maxBacklogMs: pe, ...Fe } = ue && ue !== "true" ? b : {};
				ke.current[k] = je({
					...Fe,
					timeline: Y.current
				});
			}
			A = ke.current[k];
		}
		qt.current !== ve && (se.current = [], qt.current = ve), A && !se.current[k] && (se.current[k] = [...ve, A.rehypePlugin]);
		let Z = A && se.current[k] ? se.current[k] : ve;
		return {
			blockAnimatePlugin: A,
			blockRehypePlugins: Z
		};
	};
	return t === "static" ? (0, import_jsx_runtime.jsx)(Ze.Provider, {
		value: Zt,
		children: (0, import_jsx_runtime.jsx)(Ke.Provider, {
			value: g != null ? g : null,
			children: (0, import_jsx_runtime.jsx)(S.Provider, {
				value: Wt,
				children: (0, import_jsx_runtime.jsx)(Pt, {
					icons: q,
					children: (0, import_jsx_runtime.jsx)(_e.Provider, {
						value: O,
						children: (0, import_jsx_runtime.jsx)("div", {
							className: O("space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", i),
							dir: o === "auto" ? void 0 : o,
							children: (0, import_jsx_runtime.jsx)(jt, {
								components: Xt,
								rehypePlugins: ve,
								remarkPlugins: Kt,
								...K,
								children: at
							})
						})
					})
				})
			})
		})
	}) : (0, import_jsx_runtime.jsx)(Ze.Provider, {
		value: Zt,
		children: (0, import_jsx_runtime.jsx)(Ke.Provider, {
			value: g != null ? g : null,
			children: (0, import_jsx_runtime.jsx)(S.Provider, {
				value: Wt,
				children: (0, import_jsx_runtime.jsx)(Pt, {
					icons: q,
					children: (0, import_jsx_runtime.jsx)(_e.Provider, {
						value: O,
						children: (0, import_jsx_runtime.jsxs)("div", {
							className: O("space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", h && !ct ? "[&>*:last-child]:after:inline [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-[var(--streamdown-caret)]" : null, i),
							style: sr,
							children: [G.length === 0 && h && u && (0, import_jsx_runtime.jsx)("span", {}), G.map((k, A) => {
								var Jt;
								let Z = A === G.length - 1, Q = u && Z && Ot(k), { blockAnimatePlugin: pe, blockRehypePlugins: Fe } = ar(A);
								return (0, import_jsx_runtime.jsx)(w, {
									animatePlugin: pe,
									components: Xt,
									content: k,
									dir: (Jt = it == null ? void 0 : it[A]) != null ? Jt : o !== "auto" ? o : void 0,
									index: A,
									isIncomplete: Q,
									rehypePlugins: Fe,
									remarkPlugins: Kt,
									shouldNormalizeHtmlIndentation: r,
									shouldParseIncompleteMarkdown: n,
									...K
								}, nr[A]);
							})]
						})
					})
				})
			})
		})
	});
}, (e, t) => e.children === t.children && e.shikiTheme === t.shikiTheme && e.isAnimating === t.isAnimating && e.animated === t.animated && e.mode === t.mode && e.plugins === t.plugins && e.className === t.className && e.linkSafety === t.linkSafety && e.lineNumbers === t.lineNumbers && e.codeBlockMaxHeight === t.codeBlockMaxHeight && e.tableMaxHeight === t.tableMaxHeight && e.normalizeHtmlIndentation === t.normalizeHtmlIndentation && e.literalTagContent === t.literalTagContent && JSON.stringify(e.translations) === JSON.stringify(t.translations) && e.prefix === t.prefix && e.dir === t.dir);
Xa.displayName = "Streamdown";
var or = ({ children: e, className: t, minZoom: o = .5, maxZoom: n = 3, zoomStep: r = .1, showControls: s = true, initialZoom: a = 1, fullscreen: l = false }) => {
	let { RotateCcwIcon: i, ZoomInIcon: c, ZoomOutIcon: d } = H(), p = C(), m = B(), u = (0, import_react.useRef)(null), f = (0, import_react.useRef)(null), [b, w] = (0, import_react.useState)(a), [y, h] = (0, import_react.useState)({
		x: 0,
		y: 0
	}), [g, x] = (0, import_react.useState)(false), [I, N] = (0, import_react.useState)({
		x: 0,
		y: 0
	}), [T, M] = (0, import_react.useState)({
		x: 0,
		y: 0
	}), E = (0, import_react.useCallback)((P) => {
		w((V) => Math.max(o, Math.min(n, V + P)));
	}, [o, n]), q = (0, import_react.useCallback)(() => {
		E(r);
	}, [E, r]), _ = (0, import_react.useCallback)(() => {
		E(-r);
	}, [E, r]), W = (0, import_react.useCallback)(() => {
		w(a), h({
			x: 0,
			y: 0
		});
	}, [a]), X = (0, import_react.useCallback)((P) => {
		P.preventDefault();
		let V = P.deltaY > 0 ? -r : r;
		E(V);
	}, [E, r]), K = (0, import_react.useCallback)((P) => {
		if (P.button !== 0 || P.isPrimary === false) return;
		x(true), N({
			x: P.clientX,
			y: P.clientY
		}), M(y);
		let V = P.currentTarget;
		V instanceof HTMLElement && V.setPointerCapture(P.pointerId);
	}, [y]), j = (0, import_react.useCallback)((P) => {
		if (!g) return;
		P.preventDefault();
		let V = P.clientX - I.x, re = P.clientY - I.y;
		h({
			x: T.x + V,
			y: T.y + re
		});
	}, [
		g,
		I,
		T
	]), O = (0, import_react.useCallback)((P) => {
		x(false);
		let V = P.currentTarget;
		V instanceof HTMLElement && V.releasePointerCapture(P.pointerId);
	}, []);
	return (0, import_react.useEffect)(() => {
		let P = u.current;
		if (P) return P.addEventListener("wheel", X, { passive: false }), () => {
			P.removeEventListener("wheel", X);
		};
	}, [X]), (0, import_react.useEffect)(() => {
		let P = f.current;
		if (P && g) return document.body.style.userSelect = "none", P.addEventListener("pointermove", j, { passive: false }), P.addEventListener("pointerup", O), P.addEventListener("pointercancel", O), () => {
			document.body.style.userSelect = "", P.removeEventListener("pointermove", j), P.removeEventListener("pointerup", O), P.removeEventListener("pointercancel", O);
		};
	}, [
		g,
		j,
		O
	]), (0, import_jsx_runtime.jsxs)("div", {
		className: p("relative flex flex-col", l ? "h-full w-full" : "min-h-28 w-full", t),
		ref: u,
		style: { cursor: g ? "grabbing" : "grab" },
		children: [s ? (0, import_jsx_runtime.jsxs)("div", {
			className: p("absolute z-10 flex flex-col gap-1 rounded-md border border-border bg-background/80 p-1 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm", l ? "bottom-4 left-4" : "bottom-2 left-2"),
			children: [
				(0, import_jsx_runtime.jsx)("button", {
					"aria-label": m.zoomIn,
					className: p("flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"),
					disabled: b >= n,
					onClick: q,
					title: m.zoomIn,
					type: "button",
					children: (0, import_jsx_runtime.jsx)(c, {
						"aria-hidden": "true",
						size: 16
					})
				}),
				(0, import_jsx_runtime.jsx)("button", {
					"aria-label": m.zoomOut,
					className: p("flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"),
					disabled: b <= o,
					onClick: _,
					title: m.zoomOut,
					type: "button",
					children: (0, import_jsx_runtime.jsx)(d, {
						"aria-hidden": "true",
						size: 16
					})
				}),
				(0, import_jsx_runtime.jsx)("button", {
					"aria-label": m.resetView,
					className: p("flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"),
					onClick: W,
					title: m.resetView,
					type: "button",
					children: (0, import_jsx_runtime.jsx)(i, {
						"aria-hidden": "true",
						size: 16
					})
				})
			]
		}) : null, (0, import_jsx_runtime.jsx)("div", {
			className: p("flex-1 origin-center transition-transform duration-150 ease-out", l ? "flex h-full w-full items-center justify-center" : "flex w-full items-center justify-center"),
			onPointerDown: K,
			ref: f,
			role: "application",
			style: {
				transform: `translate(${y.x}px, ${y.y}px) scale(${b})`,
				transformOrigin: "center center",
				touchAction: "none",
				willChange: "transform"
			},
			children: e
		})]
	});
};
var Vo = ({ chart: e, className: t, config: o, fullscreen: n = false, showControls: r = true }) => {
	let s = C(), [a, l] = (0, import_react.useState)(null), [i, c] = (0, import_react.useState)(false), [d, p] = (0, import_react.useState)(""), [m, u] = (0, import_react.useState)(""), [f, b] = (0, import_react.useState)(0), { mermaid: w } = (0, import_react.useContext)(S), y = ye(), h = w == null ? void 0 : w.errorComponent, { shouldRender: g, containerRef: x } = Ut({ immediate: n });
	if ((0, import_react.useEffect)(() => {
		if (!g) return;
		if (!y) {
			l("Mermaid plugin not available. Please add the mermaid plugin to enable diagram rendering.");
			return;
		}
		(async () => {
			try {
				l(null), c(!0);
				let T = y.getMermaid(o), M = e.split("").reduce((_, W) => (_ << 5) - _ + W.charCodeAt(0) | 0, 0), E = `mermaid-${Math.abs(M)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, { svg: q } = await T.render(E, e);
				p(q), u(q);
			} catch (T) {
				if (!(m || d)) {
					let M = T instanceof Error ? T.message : "Failed to render Mermaid chart";
					l(M);
				}
			} finally {
				c(false);
			}
		})();
	}, [
		e,
		o,
		f,
		g,
		y
	]), !(g || d || m)) return (0, import_jsx_runtime.jsx)("div", {
		className: s("my-4 min-h-[200px]", t),
		ref: x
	});
	if (i && !d && !m) return (0, import_jsx_runtime.jsx)("div", {
		className: s("my-4 flex justify-center p-4", t),
		ref: x,
		children: (0, import_jsx_runtime.jsxs)("div", {
			className: s("flex items-center space-x-2 text-muted-foreground"),
			children: [(0, import_jsx_runtime.jsx)("div", { className: s("h-4 w-4 animate-spin rounded-full border-current border-b-2") }), (0, import_jsx_runtime.jsx)("span", {
				className: s("text-sm"),
				children: "Loading diagram..."
			})]
		})
	});
	if (a && !d && !m) {
		let N = () => b((T) => T + 1);
		return h ? (0, import_jsx_runtime.jsx)("div", {
			ref: x,
			children: (0, import_jsx_runtime.jsx)(h, {
				chart: e,
				error: a,
				retry: N
			})
		}) : (0, import_jsx_runtime.jsxs)("div", {
			className: s("rounded-md bg-red-50 p-4", t),
			ref: x,
			children: [(0, import_jsx_runtime.jsxs)("p", {
				className: s("font-mono text-red-700 text-sm"),
				children: ["Mermaid Error: ", a]
			}), (0, import_jsx_runtime.jsxs)("details", {
				className: s("mt-2"),
				children: [(0, import_jsx_runtime.jsx)("summary", {
					className: s("cursor-pointer text-red-600 text-xs"),
					children: "Show Code"
				}), (0, import_jsx_runtime.jsx)("pre", {
					className: s("mt-2 overflow-x-auto rounded bg-red-100 p-2 text-red-800 text-xs"),
					children: e
				})]
			})]
		});
	}
	let I = d || m;
	return (0, import_jsx_runtime.jsx)("div", {
		className: s("size-full", t),
		"data-streamdown": "mermaid",
		ref: x,
		children: (0, import_jsx_runtime.jsx)(or, {
			className: s(n ? "size-full overflow-hidden" : "overflow-hidden", t),
			fullscreen: n,
			maxZoom: 3,
			minZoom: .5,
			showControls: r,
			zoomStep: .1,
			children: (0, import_jsx_runtime.jsx)("div", {
				"aria-label": "Mermaid chart",
				className: s("flex justify-center", n ? "size-full items-center" : null),
				dangerouslySetInnerHTML: { __html: I },
				role: "img"
			})
		})
	});
};
//#endregion
//#region node_modules/streamdown/dist/highlighted-body-KPVGNVTW.js
var highlighted_body_KPVGNVTW_exports = /* @__PURE__ */ __exportAll({ HighlightedCodeBlockBody: () => x });
var x = ({ code: s, language: e, maxHeight: h, raw: t, className: m, startLine: d, lineNumbers: a, ...c$1 }) => {
	let { shikiTheme: l } = (0, import_react.useContext)(S), i = El(), [p, o] = (0, import_react.useState)(t);
	return (0, import_react.useEffect)(() => {
		if (!i) {
			o(t);
			return;
		}
		let g = i.highlight({
			code: s,
			language: e,
			themes: l
		}, (H) => {
			o(H);
		});
		g && o(g);
	}, [
		s,
		e,
		l,
		i,
		t
	]), (0, import_jsx_runtime.jsx)(co, {
		className: m,
		language: e,
		lineNumbers: a,
		maxHeight: h,
		result: p,
		startLine: d,
		...c$1
	});
};
//#endregion
//#region node_modules/streamdown/dist/mermaid-HWGCJPDP.js
var mermaid_HWGCJPDP_exports = /* @__PURE__ */ __exportAll({ Mermaid: () => Vo });
//#endregion
export { twMerge as n, Xa as t };
