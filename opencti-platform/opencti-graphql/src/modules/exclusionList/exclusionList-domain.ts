import { Readable } from 'stream';
import { uploadToStorage } from '../../database/file-storage-helper';
import { deleteFile } from '../../database/file-storage';
import { createInternalObject, deleteInternalObject } from '../../domain/internalObject';
import { logApp } from '../../config/conf';
import { listEntitiesPaginated, storeLoadById } from '../../database/middleware-loader';
import type { AuthContext, AuthUser } from '../../types/user';
import { ENTITY_TYPE_EXCLUSION_LIST } from './exclusionList-types';
import { ExclusionListValuesAddInput, ExclusionListFileAddInput } from '../../generated/graphql';

export const findById = (context: AuthContext, user: AuthUser, id: string) => {
  return storeLoadById(context, user, id, ENTITY_TYPE_EXCLUSION_LIST);
};

export const findAll = (context: AuthContext, user: AuthUser, args: any) => {
  return listEntitiesPaginated(context, user, [ENTITY_TYPE_EXCLUSION_LIST], args);
};

export const addExclusionListValues = async (context: AuthContext, user: AuthUser, input: ExclusionListValuesAddInput) => {
  const file = {
    createReadStream: () => Readable.from(Buffer.from(input.values, 'utf-8')),
    filename: `${input.name}.txt`,
    mimetype: 'text/plain',
  };

  const filePath = 'exclusionLists';
  const { upload } = await uploadToStorage(context, user, filePath, file, {});

  // if (!upload.id) return error;

  const exclusionListToCreate = {
    name: input.name,
    description: input.description,
    enabled: false,
    exclusion_list_entity_types: input.list_entity_types,
    file_id: upload.id
  };

  return createInternalObject(context, user, exclusionListToCreate, ENTITY_TYPE_EXCLUSION_LIST);
};
export const addExclusionListFile = (context: AuthContext, user: AuthUser, input: ExclusionListFileAddInput) => {
  // createInternalObject
};
export const deleteExclusionList = async (context: AuthContext, user: AuthUser, exclusionListId: string) => {
  const exclusionList = await findById(context, user, exclusionListId);
  // if (!exclusionList) return error;
  const result = deleteFile(context, user, exclusionList.file_id);
  console.log('result : ', result);
  // if (!result) return error;
  logApp.info('[OPENCTI-MODULE] - DELETE exclusion list', { id: exclusionListId });
  return deleteInternalObject(context, user, exclusionListId, ENTITY_TYPE_EXCLUSION_LIST);
};
