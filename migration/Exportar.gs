// Acrescente este arquivo ao projeto Apps Script ANTIGO, antes de desativá-lo.
// Utiliza a função state_() da versão original entregue do CRM.
function exportarParaSupabase(){
 const data=state_();
 const encoded=Utilities.base64Encode(JSON.stringify(data,null,2),Utilities.Charset.UTF_8);
 const html=HtmlService.createHtmlOutput('<p>Baixe o arquivo e guarde uma cópia de segurança antes da migração.</p><a download="crm-export.json" href="data:application/json;base64,'+encoded+'">Baixar crm-export.json</a>').setWidth(420).setHeight(180);
 SpreadsheetApp.getUi().showModalDialog(html,'Exportar CRM para Supabase');
}
