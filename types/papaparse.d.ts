declare module "papaparse" {
  const Papa: {
    unparse: (data: unknown[]) => string;
    parse: (input: string) => unknown;
  };
  export default Papa;
}
