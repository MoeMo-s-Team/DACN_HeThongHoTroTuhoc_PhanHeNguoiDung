import { readFileSync } from 'node:fs';
import { AiSemanticValidator } from '../../apps/api/src/ai/ai-semantic-validator';
import { SchemaRegistryService, type AiTask } from '../../apps/api/src/ai/schema-registry.service';

const input = JSON.parse(readFileSync(0, 'utf8'));
if (!Array.isArray(input)) throw new Error('fixture set must be an array');
const schemas = new SchemaRegistryService(); const semantic = new AiSemanticValidator(schemas);
for (const fixture of input) {
  if (!fixture || !schemas.get(fixture.task as AiTask).input(fixture.input)) throw new Error('fixture input schema validation failed');
  semantic.validateInput(fixture.task as AiTask, fixture.input, fixture.authoritativeContext);
}
process.stdout.write(`validated ${input.length} fixture inputs\n`);
