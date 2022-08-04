// Copyright 2022 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import React, { useEffect, useState } from 'react';
import { get, has } from 'lodash';

import type {
  AttachmentType,
  InMemoryAttachmentDraftType,
} from '../types/Attachment';
import type { ConversationType } from '../state/ducks/conversations';
import type { LinkPreviewSourceType } from '../types/LinkPreview';
import type { LinkPreviewType } from '../types/message/LinkPreviews';
import type { LocalizerType } from '../types/Util';
import type { Props as StickerButtonProps } from './stickers/StickerButton';
import type { StoryDistributionListDataType } from '../state/ducks/storyDistributionLists';
import type { UUIDStringType } from '../types/UUID';

import { IMAGE_JPEG, TEXT_ATTACHMENT } from '../types/MIME';
import { isVideoAttachment } from '../types/Attachment';
import { SendStoryModal } from './SendStoryModal';

import { MediaEditor } from './MediaEditor';
import { TextStoryCreator } from './TextStoryCreator';

export type PropsType = {
  debouncedMaybeGrabLinkPreview: (
    message: string,
    source: LinkPreviewSourceType
  ) => unknown;
  distributionLists: Array<StoryDistributionListDataType>;
  file?: File;
  i18n: LocalizerType;
  linkPreview?: LinkPreviewType;
  me: ConversationType;
  onClose: () => unknown;
  onSend: (
    listIds: Array<UUIDStringType>,
    attachment: AttachmentType
  ) => unknown;
  processAttachment: (
    file: File
  ) => Promise<void | InMemoryAttachmentDraftType>;
  signalConnections: Array<ConversationType>;
} & Pick<StickerButtonProps, 'installedPacks' | 'recentStickers'>;

export const StoryCreator = ({
  debouncedMaybeGrabLinkPreview,
  distributionLists,
  file,
  i18n,
  installedPacks,
  linkPreview,
  me,
  onClose,
  onSend,
  processAttachment,
  recentStickers,
  signalConnections,
}: PropsType): JSX.Element => {
  const [draftAttachment, setDraftAttachment] = useState<
    AttachmentType | undefined
  >();
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>();

  useEffect(() => {
    let url: string | undefined;
    let unmounted = false;

    async function loadAttachment(): Promise<void> {
      if (!file || unmounted) {
        return;
      }

      const attachment = await processAttachment(file);
      if (!attachment || unmounted) {
        return;
      }

      if (isVideoAttachment(attachment)) {
        setDraftAttachment(attachment);
      } else if (attachment && has(attachment, 'data')) {
        url = URL.createObjectURL(new Blob([get(attachment, 'data')]));
        setAttachmentUrl(url);
      }
    }

    loadAttachment();

    return () => {
      unmounted = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, processAttachment]);

  return (
    <>
      {draftAttachment && (
        <SendStoryModal
          distributionLists={distributionLists}
          i18n={i18n}
          me={me}
          onClose={() => setDraftAttachment(undefined)}
          onSend={listIds => {
            onSend(listIds, draftAttachment);
            setDraftAttachment(undefined);
            onClose();
          }}
          signalConnections={signalConnections}
        />
      )}
      {attachmentUrl && (
        <MediaEditor
          i18n={i18n}
          imageSrc={attachmentUrl}
          installedPacks={installedPacks}
          onClose={onClose}
          onDone={data => {
            setDraftAttachment({
              contentType: IMAGE_JPEG,
              data,
              size: data.byteLength,
            });
          }}
          recentStickers={recentStickers}
        />
      )}
      {!file && (
        <TextStoryCreator
          debouncedMaybeGrabLinkPreview={debouncedMaybeGrabLinkPreview}
          i18n={i18n}
          linkPreview={linkPreview}
          onClose={onClose}
          onDone={textAttachment => {
            setDraftAttachment({
              contentType: TEXT_ATTACHMENT,
              textAttachment,
              size: textAttachment.text?.length || 0,
            });
          }}
        />
      )}
    </>
  );
};
