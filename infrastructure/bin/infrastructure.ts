#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno del archivo .env en la raíz para CDK
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { InfrastructureStack } from '../lib/infrastructure.stack';
import { config } from '../lib/common/config';
import { Stage } from '../lib/common/enum';

const app = new cdk.App();

const serviceName = config.service.name || 'TemplateCdkBaseStack';
const stackName = config.stage === Stage.PROD ? serviceName : `${serviceName}-${config.stage}`;

new InfrastructureStack(app, stackName, {
  description: 'AWS CDK Archetype Base Stack - Deploy template resources',
});

