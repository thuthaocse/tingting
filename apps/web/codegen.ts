import type { CodegenConfig } from '@graphql-codegen/cli';
const config: CodegenConfig = {
  schema: '../../graphql/schema.graphql',
  hooks: { afterAllFileWrite: ['prettier --write'] },
  generates: {
    'src/graphql/generated.ts': {
      plugins: ['typescript'],
      config: {
        skipTypename: true,
        scalars: { Money: { input: 'number', output: 'number' } },
        enumsAsTypes: true,
      },
    },
  },
};
export default config;
