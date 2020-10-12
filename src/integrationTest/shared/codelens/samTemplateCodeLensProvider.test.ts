/*!
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from 'assert'
import * as vscode from 'vscode'
import { anything, instance, mock, when } from 'ts-mockito'
import { TemplateSymbolResolver } from '../../../shared/cloudformation/templateSymbolResolver'
import { SamTemplateCodeLensProvider } from '../../../shared/codelens/samTemplateCodeLensProvider'
import { LaunchConfiguration } from '../../../shared/debug/launchConfiguration'
import { API_TARGET_TYPE, TEMPLATE_TARGET_TYPE } from '../../../shared/sam/debugger/awsSamDebugConfiguration'
import * as workspaceUtils from '../../../shared/utilities/workspaceUtils'
import * as featureToggle from '../../../shared/featureToggle'

describe('SamTemplateCodeLensProvider', async () => {
    let codeLensProvider: SamTemplateCodeLensProvider = new SamTemplateCodeLensProvider()
    let document: vscode.TextDocument
    let launchConfig: LaunchConfiguration
    let templateUri: vscode.Uri
    let mockCancellationToken: vscode.CancellationToken

    beforeEach(async () => {
        codeLensProvider = new SamTemplateCodeLensProvider()
        document = (await workspaceUtils.openTextDocument('python3.7-plain-sam-app/template.yaml'))!
        templateUri = document.uri
        launchConfig = new LaunchConfiguration(document.uri)
        mockCancellationToken = mock()
    })

    it('provides a CodeLens for a file with a new resource', async () => {
        if (featureToggle.disableApigw) {
            return
        }
        const codeLenses = await codeLensProvider.provideCodeLenses(
            document,
            instance(mockCancellationToken),
            new TemplateSymbolResolver(document),
            launchConfig,
            true
        )

        const expectedCodeLens = [
            new vscode.CodeLens(new vscode.Range(25, 4, 30, 30), {
                title: 'Add Debug Configuration',
                command: 'aws.addSamDebugConfiguration',
                arguments: [{ resourceName: 'Function2NotInLaunchJson', rootUri: templateUri }, TEMPLATE_TARGET_TYPE],
            }),
            new vscode.CodeLens(new vscode.Range(31, 4, 42, 35), {
                title: 'Add Debug Configuration',
                command: 'aws.addSamDebugConfiguration',
                arguments: [{ resourceName: 'Function3NotInLaunchJson', rootUri: templateUri }, TEMPLATE_TARGET_TYPE],
            }),
        ]

        expectedCodeLens.splice(
            0,
            0,
            new vscode.CodeLens(new vscode.Range(37, 12, 42, 35), {
                title: 'Add API Debug Configuration',
                command: 'aws.addSamDebugConfiguration',
                arguments: [{ resourceName: 'Function3NotInLaunchJson', rootUri: templateUri }, API_TARGET_TYPE],
            })
        )

        assert.deepStrictEqual(codeLenses, expectedCodeLens)
    })

    it('provides no code lenses for a file with no resources', async () => {
        let mockSymbolResolver: TemplateSymbolResolver = mock()
        when(mockSymbolResolver.getResourcesOfKind('function', anything())).thenResolve([])

        const codeLenses = await codeLensProvider.provideCodeLenses(
            document,
            instance(mockCancellationToken),
            instance(mockSymbolResolver),
            launchConfig
        )

        assert.deepStrictEqual(codeLenses, [])
    })
})
