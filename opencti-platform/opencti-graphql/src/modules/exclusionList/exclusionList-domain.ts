import { deleteInternalObject } from '../../domain/internalObject';
import { logApp } from '../../config/conf';
import { listEntitiesPaginated, storeLoadById } from '../../database/middleware-loader';
import type { AuthContext, AuthUser } from '../../types/user';
import { ENTITY_TYPE_EXCLUSION_LIST } from './exclusionList-types';
import { ExclusionListAddWithValuesInput, ExclusionListAddWithFileInput } from '../../generated/graphql';

export const findById = (context: AuthContext, user: AuthUser, id: string) => {
  return storeLoadById(context, user, id, ENTITY_TYPE_EXCLUSION_LIST);
};

export const findAll = (context: AuthContext, user: AuthUser, args: any) => {
  return listEntitiesPaginated(context, user, [ENTITY_TYPE_EXCLUSION_LIST], args);
};

export const addExclusionListWithValues = async (context: AuthContext, user: AuthUser, input: ExclusionListAddWithValuesInput) => {
  // createInternalObject

};
export const addExclusionListWithFile = (context: AuthContext, user: AuthUser, input: ExclusionListAddWithFileInput) => {
  // createInternalObject
};
export const deleteExclusionList = (context: AuthContext, user: AuthUser, exclusionListId: string) => {
  logApp.info('[OPENCTI-MODULE] - DELETE exclusion list', { id: exclusionListId });
  return deleteInternalObject(context, user, exclusionListId, ENTITY_TYPE_EXCLUSION_LIST);
};
