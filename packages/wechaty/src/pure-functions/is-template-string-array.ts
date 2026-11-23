function isTemplateStringArray (tsa: any): tsa is TemplateStringsArray {
  return Array.isArray(tsa.raw) && Array.isArray(tsa)
}

export { isTemplateStringArray }
