// WIT schema types + rendering/default helpers for the API Testing tab.
// Ported from the legacy explorer.js (witTypeLabel / defaultValue /
// getAllFunctions), typed to match the management-service `/schema` payload.

export interface WitType {
    kind: string;
    element?: WitType;
    inner?: WitType;
    ok?: WitType;
    err?: WitType;
    fields?: { name: string; type: WitType }[];
    elements?: WitType[];
    names?: string[];
}

export interface WitParam {
    name: string;
    type: WitType;
}

export interface WitResult {
    name?: string;
    type: WitType;
}

export interface FunctionSchema {
    name: string;
    params: WitParam[];
    results: WitResult[];
}

export interface InterfaceSchema {
    name: string;
    functions: FunctionSchema[];
}

export interface AppSchema {
    name: string;
    functions?: FunctionSchema[];
    interfaces?: InterfaceSchema[];
}

// Human-readable label for a WIT type, e.g. `list<u8>` or `result<string, _>`.
export function witTypeLabel(ty: WitType | undefined): string {
    if (!ty) return '?';
    switch (ty.kind) {
        case 'string': case 'bool': case 'char':
        case 'u8': case 'u16': case 'u32': case 'u64':
        case 's8': case 's16': case 's32': case 's64':
        case 'f32': case 'f64': case 'float32': case 'float64':
            return ty.kind.replace('float32', 'f32').replace('float64', 'f64');
        case 'list': return ty.element ? `list<${witTypeLabel(ty.element)}>` : 'list';
        case 'option': return ty.inner ? `option<${witTypeLabel(ty.inner)}>` : 'option';
        case 'result': return `result<${ty.ok ? witTypeLabel(ty.ok) : '_'}, ${ty.err ? witTypeLabel(ty.err) : '_'}>`;
        case 'record': return 'record';
        case 'tuple': return ty.elements ? `tuple<${ty.elements.map(witTypeLabel).join(', ')}>` : 'tuple';
        case 'variant': return 'variant';
        case 'enum': return ty.names ? `enum{${ty.names.join('|')}}` : 'enum';
        case 'flags': return 'flags';
        default: return ty.kind;
    }
}

// Sensible zero value for a WIT type, used to seed the parameter form.
export function defaultValueForType(ty: WitType | undefined): unknown {
    if (!ty) return '';
    switch (ty.kind) {
        case 'string': case 'char': return '';
        case 'bool': return false;
        case 'u8': case 'u16': case 'u32': case 'u64':
        case 's8': case 's16': case 's32': case 's64':
        case 'f32': case 'f64': case 'float32': case 'float64': return 0;
        case 'list': return [];
        case 'option': return null;
        case 'enum': return ty.names?.[0] ?? '';
        case 'record':
            if (ty.fields) {
                const obj: Record<string, unknown> = {};
                for (const f of ty.fields) obj[f.name] = defaultValueForType(f.type);
                return obj;
            }
            return {};
        default: return '';
    }
}

// Flatten top-level functions plus interface functions into one list,
// namespacing interface functions as `<iface>.<fn>`.
export function getAllFunctions(schema: AppSchema): FunctionSchema[] {
    const fns: FunctionSchema[] = [...(schema.functions ?? [])];
    if (schema.interfaces) {
        for (const iface of schema.interfaces) {
            for (const f of iface.functions) {
                fns.push({ ...f, name: `${iface.name}.${f.name}` });
            }
        }
    }
    return fns;
}
