import { describe, expect, it } from 'vitest';
import * as readline from 'node:readline';
import { prepareTaxiiGetParam, processCsvLines, processTaxiiResponse, type TaxiiResponseData } from '../../../src/manager/ingestionManager';
import { ADMIN_USER, testContext, USER_EDITOR } from '../../utils/testQuery';
import { addIngestion as addTaxiiIngestion, findById as findTaxiiIngestionById } from '../../../src/modules/ingestion/ingestion-taxii-domain';
import { type CsvMapperAddInput, IngestionAuthType, type IngestionCsvAddInput, type IngestionTaxiiAddInput, TaxiiVersion } from '../../../src/generated/graphql';
import type { StixReport } from '../../../src/types/stix-sdo';
import { addIngestionCsv, findById as findIngestionCsvById } from '../../../src/modules/ingestion/ingestion-csv-domain';
import { createCsvMapper } from '../../../src/modules/internal/csvMapper/csvMapper-domain';
import { parseCsvMapper } from '../../../src/modules/internal/csvMapper/csvMapper-utils';
import { csvMapperMockSimpleCities } from '../../data/importCsv-connector/csv-mapper-cities';
import { fileToReadStream } from '../../../src/database/file-storage-helper';

describe('Verify taxii ingestion', () => {
  it('should Taxii server response with no pagination (no next, no more, no x-taxii-date-added-last)', async () => {
    // 1. Create ingestion in opencti
    const input : IngestionTaxiiAddInput = {
      authentication_type: IngestionAuthType.None,
      collection: 'testcollection',
      ingestion_running: true,
      name: 'taxii ingestion with no pagination',
      uri: 'http://test.invalid',
      version: TaxiiVersion.V21,
    };
    const ingestionNotPagination = await addTaxiiIngestion(testContext, ADMIN_USER, input);
    expect(ingestionNotPagination.id).toBeDefined();
    expect(ingestionNotPagination.internal_id).toBeDefined();

    // 2. Check parameter send to taxii server
    const expectedParams = prepareTaxiiGetParam(ingestionNotPagination);
    expect(expectedParams.next).toBeUndefined();
    expect(expectedParams.added_after).toBeUndefined();

    // 3. Simulate a taxii server response and check opencti behavior.
    const taxiResponse: TaxiiResponseData = {
      data: {
        next: undefined,
        objects: [
          { confidence: 100,
            created: '2024-06-03T20:35:44.000Z',
            description: 'The best description of the world',
            published: '2024-06-03T20:35:44.000Z',
            revoked: false,
            spec_version: '2.1',
            type: 'report' } as unknown as StixReport],
        more: undefined
      },
      addedLastHeader: undefined
    };

    await processTaxiiResponse(testContext, ingestionNotPagination, taxiResponse);
    const result = await findTaxiiIngestionById(testContext, ADMIN_USER, ingestionNotPagination.id);
    expect(result.current_state_cursor).toBeUndefined();
    expect(result.added_after_start).toBeDefined();
  });

  it('should taxii server response with data and next page and start date', async () => {
    // 1. Create ingestion in opencti
    const input2 : IngestionTaxiiAddInput = {
      authentication_type: IngestionAuthType.None,
      collection: 'testcollection',
      ingestion_running: true,
      name: 'taxii ingestion with pagination and start date',
      uri: 'http://test.invalid',
      version: TaxiiVersion.V21,
      added_after_start: '2024-01-01T20:35:44.000Z'
    };
    const ingestionPaginatedWithStartDate = await addTaxiiIngestion(testContext, ADMIN_USER, input2);
    expect(ingestionPaginatedWithStartDate.id).toBeDefined();
    expect(ingestionPaginatedWithStartDate.internal_id).toBeDefined();

    // 2. Check parameter send to taxii server for the first call
    const expectedParams1 = prepareTaxiiGetParam(ingestionPaginatedWithStartDate);
    expect(expectedParams1.next).toBeUndefined();
    expect(expectedParams1.added_after).toBe('2024-01-01T20:35:44.000Z');

    // 3. Simulate a taxii server response with pagination (more = true) and check opencti behavior.
    const taxiResponse1: TaxiiResponseData = {
      data: {
        next: '1234',
        objects: [
          { confidence: 100,
            created: '2024-06-03T20:35:44.000Z',
            description: 'The best description of the world',
            published: '2024-06-03T20:35:44.000Z',
            revoked: false,
            spec_version: '2.1',
            type: 'report' } as unknown as StixReport],
        more: true
      },
      addedLastHeader: '2024-02-01T20:35:44.000Z'
    };

    await processTaxiiResponse(testContext, ingestionPaginatedWithStartDate, taxiResponse1);
    const taxiiEntityAfterfirstRequest = await findTaxiiIngestionById(testContext, ADMIN_USER, ingestionPaginatedWithStartDate.id);
    expect(taxiiEntityAfterfirstRequest.current_state_cursor).toBe('1234');
    expect(taxiiEntityAfterfirstRequest.added_after_start, 'should keep the start date set at ingestion creation').toBe('2024-01-01T20:35:44.000Z');

    // 4. Check parameter send to taxii server for the next call
    const expectedParams2 = prepareTaxiiGetParam(taxiiEntityAfterfirstRequest);
    expect(expectedParams2.next).toBe('1234');
    expect(expectedParams2.added_after).toBe('2024-01-01T20:35:44.000Z');

    // 5. Simulate a taxii server response with last data (more = false)
    const taxiResponse: TaxiiResponseData = {
      data: {
        next: '1334',
        objects: [
          { confidence: 100,
            created: '2024-06-03T20:35:44.000Z',
            description: 'The best description of the world',
            published: '2024-06-03T20:35:44.000Z',
            revoked: false,
            spec_version: '2.1',
            type: 'report' } as unknown as StixReport],
        more: false
      },
      addedLastHeader: '2024-03-01T20:35:44.000Z'
    };

    await processTaxiiResponse(testContext, taxiiEntityAfterfirstRequest, taxiResponse);
    const result = await findTaxiiIngestionById(testContext, ADMIN_USER, taxiiEntityAfterfirstRequest.id);
    expect(result.current_state_cursor, 'Since more is false, next value should be reset').toBeUndefined();
    expect(result.added_after_start).toBe('2024-03-01T20:35:44.000Z');
  });

  it('should taxii server response with no start date, and next page', async () => {
    // 1. Create ingestion in opencti
    const input3 : IngestionTaxiiAddInput = {
      authentication_type: IngestionAuthType.None,
      collection: 'testcollection',
      ingestion_running: true,
      name: 'taxii ingestion with pagination no start date',
      uri: 'http://test.invalid',
      version: TaxiiVersion.V21,
    };
    const ingestionPaginatedWithNoStartDate = await addTaxiiIngestion(testContext, ADMIN_USER, input3);
    expect(ingestionPaginatedWithNoStartDate.id).toBeDefined();
    expect(ingestionPaginatedWithNoStartDate.internal_id).toBeDefined();

    // 2. Check parameter send to taxii server for the first call
    const expectedParams1 = prepareTaxiiGetParam(ingestionPaginatedWithNoStartDate);
    expect(expectedParams1.next).toBeUndefined();
    expect(expectedParams1.added_after).toBeUndefined();

    // 3. Simulate a taxii server response with pagination (more = true) and check opencti behavior.
    const taxiResponse: TaxiiResponseData = {
      data: {
        next: '4321',
        objects: [
          { confidence: 100,
            created: '2024-06-03T20:35:44.000Z',
            description: 'The best description of the world',
            published: '2024-06-03T20:35:44.000Z',
            revoked: false,
            spec_version: '2.1',
            type: 'report' } as unknown as StixReport],
        more: true
      },
      addedLastHeader: '2024-02-01T20:35:44.000Z'
    };

    await processTaxiiResponse(testContext, ingestionPaginatedWithNoStartDate, taxiResponse);
    const taxiiEntityAfterFirstCall = await findTaxiiIngestionById(testContext, ADMIN_USER, ingestionPaginatedWithNoStartDate.id);
    expect(taxiiEntityAfterFirstCall.current_state_cursor).toBe('4321');
    expect(taxiiEntityAfterFirstCall.added_after_start).toBeUndefined();

    // 4. Check parameter send to taxii server for the next call
    const expectedParams2 = prepareTaxiiGetParam(taxiiEntityAfterFirstCall);
    expect(expectedParams2.next).toBe('4321');
    expect(expectedParams2.added_after).toBeUndefined();

    // 5. Simulate a taxii server response with last data (more = false)
    const taxiResponse2: TaxiiResponseData = {
      data: {
        next: '4444',
        objects: [
          { confidence: 100,
            created: '2024-06-03T20:35:44.000Z',
            description: 'The best description of the world',
            published: '2024-06-03T20:35:44.000Z',
            revoked: false,
            spec_version: '2.1',
            type: 'report' } as unknown as StixReport],
        more: false
      },
      addedLastHeader: '2024-03-01T20:44:44.000Z'
    };

    await processTaxiiResponse(testContext, taxiiEntityAfterFirstCall, taxiResponse2);
    const result = await findTaxiiIngestionById(testContext, ADMIN_USER, taxiiEntityAfterFirstCall.id);
    expect(result.current_state_cursor, 'Since more is false, next value should be reset').toBeUndefined();
    expect(result.added_after_start).toBe('2024-03-01T20:44:44.000Z');
  });

  it('should store nothing when no data', async () => {
    // 1. Create ingestion in opencti
    const input2 : IngestionTaxiiAddInput = {
      authentication_type: IngestionAuthType.None,
      collection: 'testcollection',
      ingestion_running: true,
      name: 'taxii ingestion with pagination and start date',
      uri: 'http://test.invalid',
      version: TaxiiVersion.V21,
      added_after_start: '2023-01-01T20:35:44.000Z'
    };
    const ingestionPaginatedWithStartDate = await addTaxiiIngestion(testContext, ADMIN_USER, input2);
    expect(ingestionPaginatedWithStartDate.id).toBeDefined();
    expect(ingestionPaginatedWithStartDate.internal_id).toBeDefined();

    const taxiResponse: TaxiiResponseData = {
      data: {
        next: undefined,
        objects: [],
        more: false
      },
      addedLastHeader: '2021-11-11T11:11:11.111Z'
    };

    await processTaxiiResponse(testContext, ingestionPaginatedWithStartDate, taxiResponse);
    const result = await findTaxiiIngestionById(testContext, ADMIN_USER, ingestionPaginatedWithStartDate.id);
    expect(result.current_state_cursor).toBeUndefined(); // previous value
    expect(result.added_after_start).toBe('2023-01-01T20:35:44.000Z'); // previous value
  });
});

describe('Verify csv ingestion', () => {
  it('should csv ingestion run', async () => {
    const csvMapperInput : CsvMapperAddInput = {
      has_header: true,
      name: 'testCsvIngestionMapper',
      representations: JSON.stringify(csvMapperMockSimpleCities.representations),
      separator: ',',
    };

    const mapperCreated = await createCsvMapper(testContext, ADMIN_USER, csvMapperInput);
    const ingestionCsvInput : IngestionCsvAddInput = {
      authentication_type: IngestionAuthType.None,
      ingestion_running: true,
      name: 'csv ingestion',
      uri: 'http://test.invalid',
      csv_mapper_id: mapperCreated.id,
      user_id: USER_EDITOR.id
    };
    const ingestionCsv = await addIngestionCsv(testContext, ADMIN_USER, ingestionCsvInput);
    expect(ingestionCsv.id).toBeDefined();
    expect(ingestionCsv.internal_id).toBeDefined();

    const csvMapperParsed = parseCsvMapper(mapperCreated);

    const file = fileToReadStream('./tests/data/importCsv-connector', 'csv-file-cities-for-importCsv-connector.csv', 'csv-file-cities-for-importCsv-connector.csv', 'text/csv');
    const rl = readline.createInterface({ input: file.createReadStream(), crlfDelay: Infinity });

    const csvLines: string[] = [];
    // Need an async interator to prevent blocking
    // eslint-disable-next-line no-restricted-syntax
    for await (const line of rl) {
      csvLines.push(line);
    }
    const csvLinesClone = [...csvLines];
    await processCsvLines(testContext, ingestionCsv, csvMapperParsed, csvLines, null);

    const ingestionCsvafterFirstProcess = await findIngestionCsvById(testContext, ADMIN_USER, ingestionCsv.id);

    // Second time hash is the same so it should not process any objects
    await processCsvLines(testContext, ingestionCsvafterFirstProcess, csvMapperParsed, csvLinesClone, null);
    const ingestionCsvafterSecondProcess = await findIngestionCsvById(testContext, ADMIN_USER, ingestionCsvafterFirstProcess.id);

    expect(ingestionCsvafterFirstProcess.current_state_hash).toBe(ingestionCsvafterSecondProcess.current_state_hash);

    // Not much to expect, no exception at least.
  });
});
