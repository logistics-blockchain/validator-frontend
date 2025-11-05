import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the contract source code
const sourceCodePath = path.join(__dirname, '../../../validator-contract-tests/contracts/DynamicMultiSigValidatorManager.sol');
const sourceCode = fs.readFileSync(sourceCodePath, 'utf8');

// Read the artifact
const artifactPath = path.join(__dirname, '../public/artifacts/DynamicMultiSigValidatorManager.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

// Add source code if it doesn't exist
if (!artifact.sourceCode) {
  artifact.sourceCode = sourceCode;

  // Write back to the artifact file
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log('✅ Source code added to DynamicMultiSigValidatorManager.json');
} else {
  console.log('ℹ️  Source code already exists in artifact');
}
