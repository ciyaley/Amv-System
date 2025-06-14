import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TypeScript 型安全性の強化
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      
      // Import/Export の整理
      "import/order": ["error", {
        "groups": [
          "builtin",
          "external", 
          "internal",
          "parent",
          "sibling",
          "index",
          "type"
        ],
        "pathGroups": [
          {
            "pattern": "react",
            "group": "external",
            "position": "before"
          },
          {
            "pattern": "next/**",
            "group": "external",
            "position": "after"
          },
          {
            "pattern": "@/**",
            "group": "internal",
            "position": "before"
          }
        ],
        "pathGroupsExcludedImportTypes": ["builtin"],
        "newlines-between": "never",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }],
      "import/no-unused-modules": "warn",
      
      // React hooks の依存関係チェック
      "react-hooks/exhaustive-deps": "error",
      
      // 品質向上
      "prefer-const": "error",
      "no-var": "error",
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    }
  }
];

export default eslintConfig;
