import React from "react";
import RenderMarkdown from "../Markdown/RenderMarkdown";
import ItalicText from "../ItalicText";

interface IProps {
  deleted: boolean;
  removed: boolean;
  content: string;
}

function CommentBody({ deleted, removed, content }: IProps) {
  if (deleted) {
    return <ItalicText>Comment removed by user :(</ItalicText>;
  }

  if (removed) {
    return <ItalicText>Comment removed by moderator :(</ItalicText>;
  }

  return <RenderMarkdown text={content} addImages imageSize={30} />;
}

export default React.memo(CommentBody);
