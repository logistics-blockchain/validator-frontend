#!/bin/bash

# Sync contract artifacts and deployment info from parent directory
echo "Syncing contract artifacts..."

# Copy deployment info
cp ../deployment-info.json public/

# Copy contract ABIs
cp ../artifacts/contracts/ManufacturerRegistry.sol/ManufacturerRegistry.json public/artifacts/
cp ../artifacts/contracts/LogisticsOrder.sol/LogisticsOrder.json public/artifacts/
cp ../artifacts/contracts/LogisticsOrderProxy.sol/LogisticsOrderProxy.json public/artifacts/
cp ../artifacts/contracts/LogisticsOrderV2.sol/LogisticsOrderV2.json public/artifacts/

echo "Artifacts synced successfully!"
