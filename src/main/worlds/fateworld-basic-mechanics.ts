import type {
  FateworldBasicStep,
  FateworldBasicTable,
  FateworldDeclarativeValue
} from './fateworld-basic-contract.ts'
import type { FateworldValidationError } from './fateworld-contract.ts'

export const FATEWORLD_BASIC_OPERATION_IDS = [
  'ally.attribute_adjust',
  'ally.combat_bonus',
  'ally.combat_defeat_death_prevention',
  'ally.fight_before_player',
  'ally.item_delivery',
  'ally.learn_ally_technique',
  'ally.npc_dies',
  'ally.villain_encounter_risk',
  'attribute.adjust',
  'choice.offer',
  'chronicle.fact',
  'clan.ensure',
  'combat.defeat_exception',
  'combat.modifier',
  'combat.start',
  'condition.check',
  'contract.offer',
  'dice.repeat_independent',
  'dice.roll',
  'equipment.change',
  'event.schedule',
  'interaction.offer',
  'narrative.prompt',
  'npc.create',
  'npc.reuse',
  'npc.reuse_or_create',
  'npc.select',
  'npc.transition',
  'relationship.link',
  'status.apply',
  'status.clear',
  'table.repeat',
  'table.resolve',
  'villain.encounter',
  'villain.reveal'
] as const

export const FATEWORLD_BASIC_TRIGGER_EVENTS = [
  'ally.recruited',
  'combat.block_spent',
  'combat.first_player_attack',
  'combat.player_surrender',
  'combat.successful_block',
  'combat.tie',
  'interaction.failure',
  'interaction.success',
  'npc.death_by_player',
  'villain.before_final_combat',
  'villain.encounter'
] as const

type BasicOperationId = (typeof FATEWORLD_BASIC_OPERATION_IDS)[number]
type DeclarativeObject = Readonly<Record<string, FateworldDeclarativeValue>>

interface StringSchema {
  readonly kind: 'string'
  readonly values?: readonly string[]
  readonly pattern?: RegExp
  readonly minimum?: number
  readonly reference?: 'table'
  readonly localizationNamespace?: 'choices' | 'prompts'
}

interface ObjectSchema {
  readonly kind: 'object'
  readonly required: Readonly<Record<string, ValueSchema>>
  readonly optional: Readonly<Record<string, ValueSchema>>
  readonly requireAtLeastOne?: boolean
}

interface ListSchema {
  readonly kind: 'list'
  readonly item: ValueSchema
  readonly minimum: number
  readonly maximum: number
  readonly unique?: boolean
  readonly uniqueBy?: string
}

interface StepsSchema {
  readonly kind: 'steps'
}

interface OperationSchema {
  readonly kind: 'operation'
  readonly allowed?: readonly BasicOperationId[]
}

interface UnionSchema {
  readonly kind: 'union'
  readonly options: readonly ValueSchema[]
}

type ValueSchema =
  | StringSchema
  | ObjectSchema
  | ListSchema
  | StepsSchema
  | OperationSchema
  | UnionSchema

interface OperationShape {
  readonly required: Readonly<Record<string, ValueSchema>>
  readonly optional: Readonly<Record<string, ValueSchema>>
  readonly refine?: (
    operation: DeclarativeObject,
    context: ValidationContext,
    path: string
  ) => FateworldValidationError | undefined
}

interface OperationSpec {
  readonly variants: readonly OperationShape[]
}

interface ValidationBudget {
  operations: number
}

interface ValidationContext {
  readonly tableIds: ReadonlySet<string>
  readonly tableId: string
  readonly tableEntryId: string
  readonly archiveEntry: string
  readonly maximumDepth: number
  readonly maximumOperations: number
  readonly findMissingLocalizationLanguage: (
    tableId: string,
    tableEntryId: string,
    key: string
  ) => string | undefined
  readonly budget: ValidationBudget
  readonly depth: number
}

export interface BasicMechanicsValidationOptions {
  readonly tablePaths: readonly string[]
  readonly maximumDepth: number
  readonly maximumOperations: number
  readonly findMissingLocalizationLanguage: (
    tableId: string,
    tableEntryId: string,
    key: string
  ) => string | undefined
}

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/
const INTEGER_PATTERN = /^-?(?:0|[1-9]\d*)$/
const NON_NEGATIVE_INTEGER_PATTERN = /^(?:0|[1-9]\d*)$/
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/

const identifier: StringSchema = { kind: 'string', pattern: IDENTIFIER_PATTERN }
const integer: StringSchema = { kind: 'string', pattern: INTEGER_PATTERN }
const nonNegativeInteger: StringSchema = {
  kind: 'string',
  pattern: NON_NEGATIVE_INTEGER_PATTERN
}
const positiveInteger: StringSchema = { kind: 'string', pattern: POSITIVE_INTEGER_PATTERN }
const booleanString: StringSchema = { kind: 'string', values: ['true', 'false'] }
const trueString: StringSchema = { kind: 'string', values: ['true'] }
const tableReference: StringSchema = { kind: 'string', pattern: IDENTIFIER_PATTERN, reference: 'table' }
const choiceReference: StringSchema = {
  kind: 'string',
  pattern: IDENTIFIER_PATTERN,
  localizationNamespace: 'choices'
}
const promptReference: StringSchema = {
  kind: 'string',
  pattern: IDENTIFIER_PATTERN,
  localizationNamespace: 'prompts'
}
const steps: StepsSchema = { kind: 'steps' }

function oneOf(...values: string[]): StringSchema {
  return { kind: 'string', values }
}

function object(
  required: Readonly<Record<string, ValueSchema>>,
  optional: Readonly<Record<string, ValueSchema>> = {},
  requireAtLeastOne = false
): ObjectSchema {
  return { kind: 'object', required, optional, requireAtLeastOne }
}

function list(
  item: ValueSchema,
  minimum = 0,
  maximum = 64,
  options: { readonly unique?: boolean; readonly uniqueBy?: string } = {}
): ListSchema {
  return { kind: 'list', item, minimum, maximum, ...options }
}

function union(...options: ValueSchema[]): UnionSchema {
  return { kind: 'union', options }
}

function operation(allowed?: readonly BasicOperationId[]): OperationSchema {
  return allowed === undefined ? { kind: 'operation' } : { kind: 'operation', allowed }
}

function shape(
  required: Readonly<Record<string, ValueSchema>> = {},
  optional: Readonly<Record<string, ValueSchema>> = {},
  refine?: OperationShape['refine']
): OperationShape {
  return refine === undefined ? { required, optional } : { required, optional, refine }
}

function spec(...variants: OperationShape[]): OperationSpec {
  return { variants }
}

const d6Face = oneOf('1', '2', '3', '4', '5', '6')
const d6Faces = list(d6Face, 1, 6, { unique: true })
const countValue = union(positiveInteger, oneOf('rolled_face'))
const attribute = oneOf('compassion', 'determination', 'reputation')
const status = oneOf('imprisoned', 'wounded')

const choice = object({ id: choiceReference, steps })
const choices = list(choice, 2, 64, { uniqueBy: 'id' })
const dieBranch = object({ faces: d6Faces, steps })
const dieBranches = list(dieBranch, 1, 6)

const outcomeSteps = object(
  {},
  {
    victory: steps,
    defeat: steps
  },
  true
)

const inlineOpponent = object(
  {
    id: identifier,
    combat: integer,
    block: nonNegativeInteger,
    count: countValue
  },
  { equipment: identifier }
)
const referencedOpponent = object({ ref: identifier })
const anonymousOpponent = object({
  role: oneOf('enemy'),
  combat: integer,
  block: nonNegativeInteger,
  count: countValue
})
const combatOpponent = union(inlineOpponent, referencedOpponent, anonymousOpponent)

const genericPotentialAlly = object({ role: oneOf('potential_ally') })
const occupiedPotentialAlly = object({
  role: oneOf('potential_ally'),
  occupation: identifier
})
const identifiedOther = object({ role: oneOf('other'), identity: identifier })
const identifiedNpc = object(
  {
    id: identifier,
    role: oneOf('enemy', 'other'),
    combat: integer,
    block: nonNegativeInteger
  },
  {
    count: countValue,
    equipment: identifier,
    interactionRestrictions: list(oneOf('intimidate'), 1, 8, { unique: true })
  }
)
const npcProfile = union(
  genericPotentialAlly,
  occupiedPotentialAlly,
  identifiedOther,
  identifiedNpc
)

const attributeCondition = object({
  type: oneOf('attribute_compare'),
  attribute,
  operator: oneOf('gte'),
  value: integer
})
const chronicleFactCondition = object({
  type: oneOf('chronicle_has_fact'),
  fact: identifier
})
const npcCountCondition = object(
  {
    type: oneOf('npc_count'),
    role: oneOf('ally', 'enemy'),
    operator: oneOf('gte'),
    value: nonNegativeInteger
  },
  { filter: oneOf('spared') }
)
const condition = union(attributeCondition, chronicleFactCondition, npcCountCondition)

function invalidOperation(message: string, entry: string): FateworldValidationError {
  return { code: 'INVALID_OPERATION', message, entry }
}

function brokenReference(message: string, entry: string): FateworldValidationError {
  return { code: 'BROKEN_REFERENCE', message, entry }
}

function isObject(value: FateworldDeclarativeValue): value is DeclarativeObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function operationKeysMatch(operationValue: DeclarativeObject, candidate: OperationShape): boolean {
  const required = new Set(['op', ...Object.keys(candidate.required)])
  const allowed = new Set([...required, ...Object.keys(candidate.optional)])
  const keys = Object.keys(operationValue)
  return keys.every((key) => allowed.has(key)) && [...required].every((key) => key in operationValue)
}

function validateString(
  value: FateworldDeclarativeValue,
  schema: StringSchema,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 120 ||
    (schema.values !== undefined && !schema.values.includes(value)) ||
    (schema.pattern !== undefined && !schema.pattern.test(value))
  ) {
    return invalidOperation(`${path} no contiene un valor Basic 1.0.0 admitido.`, context.archiveEntry)
  }
  if (schema.minimum !== undefined && Number(value) < schema.minimum) {
    return invalidOperation(`${path} no respeta el mínimo admitido.`, context.archiveEntry)
  }
  if (schema.reference === 'table' && !context.tableIds.has(value)) {
    return brokenReference(`${path} referencia la tabla inexistente "${value}".`, context.archiveEntry)
  }
  if (schema.localizationNamespace !== undefined) {
    const key = `${schema.localizationNamespace}.${value}`
    const language = context.findMissingLocalizationLanguage(
      context.tableId,
      context.tableEntryId,
      key
    )
    if (language !== undefined) {
      return brokenReference(
        `${path} referencia la clave localizada inexistente "${key}" para ${language}.`,
        context.archiveEntry
      )
    }
  }
  return undefined
}

function validateObject(
  value: FateworldDeclarativeValue,
  schema: ObjectSchema,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  if (!isObject(value)) {
    return invalidOperation(`${path} debe ser un mapa.`, context.archiveEntry)
  }
  const required = Object.keys(schema.required)
  const allowed = new Set([...required, ...Object.keys(schema.optional)])
  const unknown = Object.keys(value).find((key) => !allowed.has(key))
  if (unknown !== undefined) {
    return invalidOperation(`${path} contiene el campo no admitido "${unknown}".`, context.archiveEntry)
  }
  const missing = required.find((key) => !(key in value))
  if (missing !== undefined) {
    return invalidOperation(`${path} no contiene el campo obligatorio "${missing}".`, context.archiveEntry)
  }
  if (schema.requireAtLeastOne === true && Object.keys(value).length === 0) {
    return invalidOperation(`${path} debe contener al menos un campo admitido.`, context.archiveEntry)
  }
  for (const [key, fieldSchema] of Object.entries(schema.required)) {
    const error = validateValue(value[key] as FateworldDeclarativeValue, fieldSchema, context, `${path}.${key}`)
    if (error) return error
  }
  for (const [key, fieldSchema] of Object.entries(schema.optional)) {
    if (key in value) {
      const error = validateValue(value[key] as FateworldDeclarativeValue, fieldSchema, context, `${path}.${key}`)
      if (error) return error
    }
  }
  return undefined
}

function validateList(
  value: FateworldDeclarativeValue,
  schema: ListSchema,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  if (!Array.isArray(value) || value.length < schema.minimum || value.length > schema.maximum) {
    return invalidOperation(`${path} no contiene una lista dentro de los límites admitidos.`, context.archiveEntry)
  }
  const uniqueValues = new Set<string>()
  for (const [index, item] of value.entries()) {
    const error = validateValue(item, schema.item, context, `${path}[${index}]`)
    if (error) return error
    let uniqueValue: string | undefined
    if (schema.unique === true && typeof item === 'string') uniqueValue = item
    if (schema.uniqueBy !== undefined && isObject(item)) {
      const candidate = item[schema.uniqueBy]
      if (typeof candidate === 'string') uniqueValue = candidate
    }
    if (uniqueValue !== undefined) {
      if (uniqueValues.has(uniqueValue)) {
        return invalidOperation(`${path} contiene el valor duplicado "${uniqueValue}".`, context.archiveEntry)
      }
      uniqueValues.add(uniqueValue)
    }
  }
  return undefined
}

function validateUnion(
  value: FateworldDeclarativeValue,
  schema: UnionSchema,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  const initialOperations = context.budget.operations
  for (const candidate of schema.options) {
    context.budget.operations = initialOperations
    const error = validateValue(value, candidate, context, path)
    if (error === undefined) return undefined
  }
  context.budget.operations = initialOperations
  return invalidOperation(`${path} no coincide con ninguna variante Basic 1.0.0 admitida.`, context.archiveEntry)
}

function validateValue(
  value: FateworldDeclarativeValue,
  schema: ValueSchema,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  switch (schema.kind) {
    case 'string':
      return validateString(value, schema, context, path)
    case 'object':
      return validateObject(value, schema, context, path)
    case 'list':
      return validateList(value, schema, context, path)
    case 'steps':
      return validateSteps(value, { ...context, depth: context.depth + 1 }, path)
    case 'operation':
      if (!isObject(value)) {
        return invalidOperation(`${path} debe ser una operación.`, context.archiveEntry)
      }
      if (schema.allowed !== undefined) {
        const nestedId = value.op
        if (typeof nestedId !== 'string' || !schema.allowed.includes(nestedId as BasicOperationId)) {
          return invalidOperation(`${path} no admite la operación declarada.`, context.archiveEntry)
        }
      }
      return validateOperation(value as FateworldBasicStep, { ...context, depth: context.depth + 1 }, path)
    case 'union':
      return validateUnion(value, schema, context, path)
  }
}

function validateDiceBranches(
  operationValue: DeclarativeObject,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  const branches = operationValue.branches
  if (!Array.isArray(branches)) return undefined
  const observed = new Set<string>()
  for (const branch of branches) {
    if (!isObject(branch) || !Array.isArray(branch.faces)) continue
    for (const face of branch.faces) {
      if (typeof face !== 'string') continue
      if (observed.has(face)) {
        return invalidOperation(`${path}.branches repite la cara d6 "${face}".`, context.archiveEntry)
      }
      observed.add(face)
    }
  }
  if (observed.size !== 6) {
    return invalidOperation(`${path}.branches debe cubrir exactamente las seis caras d6.`, context.archiveEntry)
  }
  return undefined
}

function validateCombatStart(
  operationValue: DeclarativeObject,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  const opponent = operationValue.opponent
  if (!isObject(opponent)) return undefined
  const hasReference = 'ref' in opponent
  const hasAnonymousRole = 'role' in opponent
  if ('before' in operationValue && (!hasReference || 'context' in operationValue || 'onOutcome' in operationValue)) {
    return invalidOperation(`${path} usa una combinación no admitida para un combate previo.`, context.archiveEntry)
  }
  if ('context' in operationValue && (!hasAnonymousRole || 'before' in operationValue || 'onOutcome' in operationValue)) {
    return invalidOperation(`${path} usa una combinación no admitida para un combate contextual.`, context.archiveEntry)
  }
  if (hasReference && !('before' in operationValue)) {
    return invalidOperation(`${path}.opponent requiere before cuando referencia un NPC.`, context.archiveEntry)
  }
  if (hasAnonymousRole && !('context' in operationValue)) {
    return invalidOperation(`${path}.opponent requiere context cuando declara solo un rol.`, context.archiveEntry)
  }
  return undefined
}

function validateScheduledEvent(
  operationValue: DeclarativeObject,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  const recurrent = operationValue.recurrent
  const trigger = operationValue.trigger
  if (
    (recurrent === 'true' && trigger !== 'after_each_journey') ||
    (recurrent === 'false' && trigger === 'after_each_journey')
  ) {
    return invalidOperation(`${path} no combina correctamente trigger y recurrent.`, context.archiveEntry)
  }
  return undefined
}

function validateNpcSelection(
  operationValue: DeclarativeObject,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  const role = operationValue.role
  const expectedOrder: Readonly<Record<string, string>> = {
    allied_living: 'random',
    potential_ally_at_first_encounter: 'first_encountered',
    potential_ally_not_recruited: 'last_encountered',
    villain: 'first_encountered'
  }
  if (typeof role === 'string' && role in expectedOrder && operationValue.order !== expectedOrder[role]) {
    return invalidOperation(`${path} no usa el orden admitido para el rol seleccionado.`, context.archiveEntry)
  }
  if (role === 'ally' && (operationValue.choice !== 'random' || 'filter' in operationValue || 'onEmpty' in operationValue)) {
    return invalidOperation(`${path} no usa la selección aleatoria de aliado admitida.`, context.archiveEntry)
  }
  if (role === 'enemy' && (operationValue.choice !== 'player' || !('filter' in operationValue))) {
    return invalidOperation(`${path} no usa la selección de enemigo admitida.`, context.archiveEntry)
  }
  if (
    operationValue.onEmpty === 'notify_and_skip_without_reroll' &&
    (role !== 'enemy' || operationValue.filter !== 'spared_recently')
  ) {
    return invalidOperation(
      `${path}.onEmpty solo puede omitir la tirada para un enemigo perdonado recientemente.`,
      context.archiveEntry
    )
  }
  return undefined
}

function validateNpcTransition(
  operationValue: DeclarativeObject,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  if (
    operationValue.ref === 'hostage' &&
    !(
      (operationValue.transition === 'killed' && operationValue.cause === 'used_as_shield') ||
      (operationValue.transition === 'held_prisoner' && operationValue.cause === 'player_surrendered')
    )
  ) {
    return invalidOperation(`${path} no combina correctamente la transición y su causa.`, context.archiveEntry)
  }
  return undefined
}

function validateEquipmentTarget(
  operationValue: DeclarativeObject,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  const target = operationValue.target
  const transition = operationValue.transition
  if (
    (target === 'player_chosen_valuables' && transition !== 'given') ||
    (target !== 'player_chosen_valuables' && transition !== 'stolen')
  ) {
    return invalidOperation(`${path} no combina correctamente target y transition.`, context.archiveEntry)
  }
  return undefined
}

function validateStatusApplication(
  operationValue: DeclarativeObject,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  if ('target' in operationValue && operationValue.status !== 'wounded') {
    return invalidOperation(`${path}.target solo se admite para el estado wounded.`, context.archiveEntry)
  }
  return undefined
}

const OPERATION_REGISTRY: Readonly<Record<BasicOperationId, OperationSpec>> = {
  'ally.attribute_adjust': spec(shape({ attribute, amount: integer })),
  'ally.combat_bonus': spec(shape({ amount: integer, whileNpcAlliedAndAlive: trueString })),
  'ally.combat_defeat_death_prevention': spec(
    shape({
      scope: oneOf('player_defeat_in_combat'),
      includesExplicitLethalOutcome: trueString,
      doesNotProtectSurrender: trueString,
      doesNotProtectOtherDeath: trueString
    })
  ),
  'ally.fight_before_player': spec(
    shape({
      trigger: oneOf('next_villain_combat'),
      ifWins: oneOf('leave_party'),
      ifDefeated: oneOf('npc_dies'),
      villainBlockCarriesIntoPlayerCombat: trueString
    })
  ),
  'ally.item_delivery': spec(
    shape({
      trigger: oneOf('next_large_city'),
      item: object({
        type: oneOf('improved_own_weapon'),
        baseWeaponFrom: oneOf('player_current_weapon'),
        combatBonus: integer
      }),
      grantOnlyOnce: trueString
    })
  ),
  'ally.learn_ally_technique': spec(
    shape({ techniqueFrom: oneOf('this_npc'), chooseActiveTechniqueDuringCombat: trueString })
  ),
  'ally.npc_dies': spec(shape({ ref: oneOf('this_npc') })),
  'ally.villain_encounter_risk': spec(
    shape({
      trigger: oneOf('on_villain_encounter'),
      die: oneOf('d6'),
      onFaces: d6Faces,
      bonusEndsOnDeath: trueString,
      steps
    })
  ),
  'attribute.adjust': spec(shape({ attribute, amount: integer })),
  'choice.offer': spec(shape({ choices })),
  'chronicle.fact': spec(shape({ fact: identifier, subject: identifier })),
  'clan.ensure': spec(
    shape({ tableIds: list(tableReference, 2, 2, { unique: true }) })
  ),
  'combat.defeat_exception': spec(shape({ kind: oneOf('lethal_unless_healer') })),
  'combat.modifier': spec(
    shape({ target: oneOf('player'), amount: integer, source: identifier, scope: oneOf('next_attack') }),
    shape({ amount: integer, scope: oneOf('until_repaired') }),
    shape({ target: oneOf('selected_enemy'), amount: integer, source: identifier, base: oneOf('original_combat') }),
    shape({
      target: oneOf('this_villain'),
      amount: integer,
      trigger: oneOf('each_block_point_spent'),
      duration: oneOf('current_duel')
    }),
    shape({ amount: integer, scope: oneOf('while_owned'), targetRole: oneOf('villain') }),
    shape({ target: oneOf('next_combat_roll'), amount: integer, duration: oneOf('next_roll') }),
    shape({ target: oneOf('first_player_attack'), effect: oneOf('blocked_by_hostage') })
  ),
  'combat.start': spec(
    shape(
      { opponent: combatOpponent },
      {
        before: oneOf('final_villain_combat'),
        context: oneOf('search-before-completion', 'search-failure'),
        onOutcome: outcomeSteps
      },
      validateCombatStart
    )
  ),
  'condition.check': spec(shape({ condition, onTrue: steps, onFalse: steps })),
  'contract.offer': spec(
    shape({
      type: oneOf('assassination'),
      target: object({
        role: oneOf('samurai'),
        combat: integer,
        block: nonNegativeInteger,
        clan: oneOf('noble')
      }),
      trigger: oneOf('next_settlement'),
      reward: oneOf('unspecified_money')
    })
  ),
  'dice.repeat_independent': spec(
    shape(
      { die: oneOf('d6'), count: positiveInteger, branches: dieBranches },
      {},
      validateDiceBranches
    )
  ),
  'dice.roll': spec(
    shape({ die: oneOf('d6'), branches: dieBranches }, {}, validateDiceBranches)
  ),
  'equipment.change': spec(
    shape(
      { itemId: identifier, transition: oneOf('damaged', 'deliver', 'obtain', 'recover', 'stolen', 'temporarily_unavailable') },
      { owner: oneOf('player'), effect: operation(['combat.modifier']) }
    ),
    shape(
      { target: oneOf('player_belongings', 'player_chosen_valuables', 'potential_ally_belongings'), transition: oneOf('given', 'stolen') },
      {},
      validateEquipmentTarget
    ),
    shape({ target: oneOf('opponent_weapon'), requiredTags: list(identifier, 1, 16, { unique: true }), state: oneOf('destroyed') })
  ),
  'event.schedule': spec(
    shape(
      {
        eventId: identifier,
        trigger: oneOf('after_each_journey', 'after_narrative_days', 'next_night', 'next_settlement'),
        recurrent: booleanString,
        steps
      },
      {},
      validateScheduledEvent
    )
  ),
  'interaction.offer': spec(
    shape({
      actor: identifier,
      options: list(oneOf('combat', 'dialogue', 'leave'), 1, 3, { unique: true }),
      onDialogueFailure: steps
    })
  ),
  'narrative.prompt': spec(shape({ promptId: promptReference })),
  'npc.create': spec(shape({ profile: npcProfile })),
  'npc.reuse': spec(
    shape(),
    shape({ ref: identifier }),
    shape({ selection: oneOf('previous'), as: oneOf('final_villain', 'hostage', 'traitor', 'villain_servant') }, { preserveIdentity: trueString })
  ),
  'npc.reuse_or_create': spec(
    shape({ link: oneOf('person_from_player_past'), role: oneOf('potential_ally') })
  ),
  'npc.select': spec(
    shape(
      { role: oneOf('ally', 'enemy'), choice: oneOf('player', 'random'), onSelected: steps },
      { filter: oneOf('spared', 'spared_recently'), onEmpty: oneOf('notify_and_skip_without_reroll') },
      validateNpcSelection
    ),
    shape(
      {
        role: oneOf('allied_living', 'potential_ally_at_first_encounter', 'potential_ally_not_recruited', 'villain'),
        order: oneOf('first_encountered', 'last_encountered', 'random'),
        requireExisting: trueString,
        onEmpty: oneOf('needs_player_resolution')
      },
      {},
      validateNpcSelection
    )
  ),
  'npc.transition': spec(
    shape({ to: oneOf('potential_ally') }),
    shape({ subject: oneOf('interaction_target'), transition: oneOf('potential_ally_to_ally') }),
    shape(
      { ref: oneOf('hostage'), transition: oneOf('held_prisoner', 'killed'), cause: oneOf('player_surrendered', 'used_as_shield') },
      {},
      validateNpcTransition
    )
  ),
  'relationship.link': spec(
    shape({
      subject: identifier,
      relation: oneOf('henchman_of_final_villain', 'sibling_of'),
      object: identifier
    })
  ),
  'status.apply': spec(
    shape({ status }, { target: oneOf('selected_ally') }, validateStatusApplication)
  ),
  'status.clear': spec(shape({ status: oneOf('imprisoned') })),
  'table.repeat': spec(shape({ tableId: tableReference, count: positiveInteger })),
  'table.resolve': spec(shape({ tableId: tableReference }, { context: identifier })),
  'villain.encounter': spec(shape({ slot: oneOf('next') })),
  'villain.reveal': spec(
    shape({ slot: oneOf('next') }),
    shape({ slot: oneOf('final'), tableId: tableReference })
  )
}

function validateOperation(
  operationValue: FateworldBasicStep,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  context.budget.operations += 1
  if (context.budget.operations > context.maximumOperations) {
    return invalidOperation('El paquete supera el límite de operaciones Basic.', context.archiveEntry)
  }
  if (context.depth > context.maximumDepth) {
    return invalidOperation(`${path} supera la profundidad de operaciones admitida.`, context.archiveEntry)
  }
  const operationId = operationValue.op
  if (!FATEWORLD_BASIC_OPERATION_IDS.includes(operationId as BasicOperationId)) {
    return invalidOperation(`${path} usa la operación desconocida "${operationId}".`, context.archiveEntry)
  }
  const operationSpec = OPERATION_REGISTRY[operationId as BasicOperationId]
  const matchingVariant = operationSpec.variants.find((candidate) =>
    operationKeysMatch(operationValue, candidate)
  )
  if (matchingVariant === undefined) {
    return invalidOperation(
      `${path} no contiene la combinación de parámetros admitida para "${operationId}".`,
      context.archiveEntry
    )
  }
  for (const [key, schema] of Object.entries(matchingVariant.required)) {
    const error = validateValue(
      operationValue[key] as FateworldDeclarativeValue,
      schema,
      context,
      `${path}.${key}`
    )
    if (error) return error
  }
  for (const [key, schema] of Object.entries(matchingVariant.optional)) {
    if (key in operationValue) {
      const error = validateValue(
        operationValue[key] as FateworldDeclarativeValue,
        schema,
        context,
        `${path}.${key}`
      )
      if (error) return error
    }
  }
  return matchingVariant.refine?.(operationValue, context, path)
}

function validateSteps(
  value: FateworldDeclarativeValue,
  context: ValidationContext,
  path: string
): FateworldValidationError | undefined {
  if (!Array.isArray(value)) {
    return invalidOperation(`${path} debe ser una lista de operaciones.`, context.archiveEntry)
  }
  for (const [index, candidate] of value.entries()) {
    if (!isObject(candidate) || typeof candidate.op !== 'string') {
      return invalidOperation(`${path}[${index}] debe ser una operación Basic.`, context.archiveEntry)
    }
    const error = validateOperation(candidate as FateworldBasicStep, context, `${path}[${index}]`)
    if (error) return error
  }
  return undefined
}

export function validateBasicMechanics(
  tables: readonly FateworldBasicTable[],
  options: BasicMechanicsValidationOptions
): FateworldValidationError | undefined {
  const tableIds = new Set(tables.map((table) => table.id))
  const triggerEvents = new Set<string>(FATEWORLD_BASIC_TRIGGER_EVENTS)
  const budget: ValidationBudget = { operations: 0 }

  for (const [tableIndex, table] of tables.entries()) {
    const archiveEntry = options.tablePaths[tableIndex] ?? 'manifest.yaml'
    for (const [entryIndex, tableEntry] of table.entries.entries()) {
      const baseContext: ValidationContext = {
        tableIds,
        tableId: table.id,
        tableEntryId: tableEntry.id,
        archiveEntry,
        maximumDepth: options.maximumDepth,
        maximumOperations: options.maximumOperations,
        findMissingLocalizationLanguage: options.findMissingLocalizationLanguage,
        budget,
        depth: 1
      }
      const stepsError = validateSteps(
        tableEntry.outcome.steps,
        baseContext,
        `entries[${entryIndex}].outcome.steps`
      )
      if (stepsError) return stepsError

      const observedTriggers = new Set<string>()
      for (const [triggerIndex, trigger] of tableEntry.outcome.triggers.entries()) {
        if (!triggerEvents.has(trigger.event)) {
          return {
            code: 'INVALID_TRIGGER',
            message: `entries[${entryIndex}].outcome.triggers[${triggerIndex}] usa el evento desconocido "${trigger.event}".`,
            entry: archiveEntry
          }
        }
        if (observedTriggers.has(trigger.event)) {
          return {
            code: 'INVALID_TRIGGER',
            message: `entries[${entryIndex}].outcome.triggers repite el evento "${trigger.event}".`,
            entry: archiveEntry
          }
        }
        observedTriggers.add(trigger.event)
        const triggerError = validateSteps(
          trigger.steps,
          baseContext,
          `entries[${entryIndex}].outcome.triggers[${triggerIndex}].steps`
        )
        if (triggerError) return triggerError
      }
    }
  }
  return undefined
}
