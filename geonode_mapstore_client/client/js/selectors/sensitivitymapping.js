/*
 * Copyright 2025, National Environmental Emergencies Centre, ECCC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createSelector } from 'reselect';
import { createControlEnabledSelector } from '@mapstore/framework/selectors/controls';

export const enabledSelector = createControlEnabledSelector("sensitivityMapping");

export const sensitivityMappingStateSelector = state => state?.sensitivityMapping ?? {};

export const sensitivityMappingPrintApplications = state =>
    state?.sensitivityMapping?.printApplications ?? [];

export const sensitivityMappingSelectedApplication = state =>
    state?.sensitivityMapping?.selectedPrintApplication;

export const sensitivityMappingPrintProperties = state =>
    state?.sensitivityMapping?.printProperties;

export const sensitivityMappingPrintCapabilities = state =>
    state?.sensitivityMapping?.selectedPrintCapabilities;

export const sensitivityMappingCoordinatesSystems = state =>
    state?.sensitivityMapping?.projections ?? [];

export const sensitivityMappingDownloadUrl = state =>
    state?.sensitivityMapping?.downloadUrl;

export const sensitivityMappingLoadingSelector = state =>
    state?.sensitivityMapping?.loading ?? false;

export const sensitivityMappingErrorSelector = state =>
    state?.sensitivityMapping?.error ?? false;

export const sensitivityMappingLayersSelector = state =>
    state?.sensitivityMapping?.layers ?? [];

export const sensitivityMappingPrintLayoutSelector = state =>
    state?.sensitivityMapping?.printLayout;

export const sensitivityMappingInitialMapPropertiesSelector = state =>
    state?.sensitivityMapping?.initialMapProperties;

export const sensitivityMappingProjectionsSelector = state =>
    state?.sensitivityMapping?.projections ?? [];

export const mapfishConfigSelector = createSelector(
    state => state?.localConfig?.plugins?.map_viewer,
    (plugins) => plugins?.find((plugin) => plugin.name === "SensitivityMapping")?.cfg ?? null
);

export const mapfishUrlSelector = createSelector(
    state => state?.gnsettings?.geonodeUrl,
    mapfishConfigSelector,
    (geonodeUrl, cfg) => cfg ? `${geonodeUrl}${cfg.mapfishUrl}` : null
);

export const printExtentAdditionalLayerSelector = state =>
    state?.additionallayers?.find(l => l.id === "sensitivity-mapping-print-extent");

export const progressCardVisibleSelector = state =>
    state?.sensitivityMapping?.progressCardVisible ?? false;

export const progressMessagesSelector = state =>
    state?.sensitivityMapping?.progressMessages ?? [];

export const progressCurrentStepSelector = state =>
    state?.sensitivityMapping?.progressCurrentStep ?? 0;

export const progressTotalStepsSelector = state =>
    state?.sensitivityMapping?.progressTotalSteps ?? 0;
