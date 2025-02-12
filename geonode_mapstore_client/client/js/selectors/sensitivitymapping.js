/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';

export const enabledSelector = createControlEnabledSelector("sensitivityMapping");

export const sensitivityMappingPrintApplication = state => state?.sensitivityMapping?.selectedPrintApplication;
export const sensitivityMappingPrintProperties = state => state?.sensitivityMapping?.printProperties;
export const sensitivityMappingPrintCapabilities = state => state?.sensitivityMapping?.selectedPrintCapabilities;
export const sensitivityMappingCoordinatesSystems = state => state?.sensitivityMapping?.projections;
export const sensitivityMappingDownloadUrl = state => state?.sensitivityMapping?.downloadUrl;
