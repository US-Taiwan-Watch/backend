'use client';
import React from "react";
import { useRouter } from "next/navigation";
import { useDocumentInfo } from "@payloadcms/ui";
import { useForm, useField } from "@payloadcms/ui";

const RecordReviewSection: React.FC = () => {
  const history = useRouter();
  const { id } = useDocumentInfo();
  const { submit, getFields } = useForm();
  const { value: status } = useField<string>({ path: "status" });

  // const redirectToDraftList = () => {
  //   history.push(
  //     "/admin/collections/taiwan-records?limit=10&page=1&where[or][0][and][0][status][equals]=drafted"
  //   );
  // };

  const redirectToDraftList = () => {
    history.push(
      "/admin/collections/taiwan-records"
    );
  };

  const handleApprove = async () => {
    try {
      await submit();
      const fields = getFields();
      const hasErrors = Object.values(fields).some(
        (field) => !!field?.errorMessage
      );
      if (hasErrors) return;

      const response = await fetch(`/api/taiwan-records/approve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) redirectToDraftList();
      else alert("Failed to approve record");
    } catch (err) {
      console.error(err);
      alert("Failed to approve record");
    }
  };

  const handleReject = async () => {
    try {
      const response = await fetch(`/api/taiwan-records/reject/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) redirectToDraftList();
      else alert("Failed to reject record");
    } catch (err) {
      console.error(err);
      alert("Failed to reject record");
    }
  };

  const handleUnpublish = async () => {
    try {
      const response = await fetch(`/api/taiwan-records/unpublish/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) redirectToDraftList();
      else alert("Failed to unpublish record");
    } catch (err) {
      console.error(err);
      alert("Failed to unpublish record");
    }
  };

  const showApproveReject = status === "inReview";
  const showUnpublish = status === "published";

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {/* Save 按鈕 */}
      <button
        type="button"
        onClick={() => submit()}
        className="btn btn--style-primary btn--icon-style-without-border btn--size-small btn--icon-position-right"
      >
        Save
      </button>

      {/* Approve, Reject 按鈕 */}
      {showApproveReject && (
        <>
          <button
            type="button"
            onClick={handleApprove}
            className="btn btn--style-primary btn--icon-style-without-border btn--size-small btn--icon-position-right"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="btn btn--style-primary btn--icon-style-without-border btn--size-small btn--icon-position-right"
          >
            Reject
          </button>
        </>
      )}

      {/* Unpublish 按鈕 */}
      {showUnpublish && (
        <button
          type="button"
          onClick={handleUnpublish}
          className="btn btn--style-primary btn--icon-style-without-border btn--size-small btn--icon-position-right"
        >
          Unpublish
        </button>
      )}
    </div>
  );
};

export default RecordReviewSection;
