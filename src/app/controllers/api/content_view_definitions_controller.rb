class Api::ContentViewDefinitionsController < Api::ApiController
  respond_to :json
  before_filter :find_definition, :except => [:index, :create]
  before_filter :find_organization, :except => [:destroy, :update,
    :content_views, :update_content_views]
  before_filter :find_optional_environment, :only => [:index]
  before_filter :authorize

  def rules
    index_rule   = lambda { ContentViewDefinition.any_readable?(@organization) }
    show_rule    = lambda { @definition.readable? }
    manage_rule  = lambda { @definition.editable? }
    publish_rule = lambda { @definition.publishable? }
    create_rule  = lambda { ContentViewDefinition.creatable?(@organization) }

    {
      :index => index_rule,
      :create => create_rule,
      :publish => publish_rule,
      :show => show_rule,
      :update => manage_rule,
      :destroy => manage_rule,
      :content_views => show_rule,
      :update_content_views => manage_rule
    }
  end

  api :GET, "/organizations/:organization_id/content_view_definitions",
    "List content view definitions"
  param :organization_id, :identifier, :desc => "organization identifier"
  param :label, String, :desc => "content view label"
  param :name, String, :desc => "content view name"
  param :id, :identifier, :desc => "content view id"
  def index
    query_params.delete(:organization_id)
    @definitions = ContentViewDefinition.where(query_params).readable(@organization)

    render :json => @definitions
  end

  api :POST, "/content_view_definitions",
    "Create a content view definition"
  param :organization_id, :identifier, :desc => "organization identifier"
  param :content_view_definition, Hash do
    param :name, String, :desc => "Content view definition name",
      :required => true
    param :label, String, :desc => "Content view identifier"
    param :description, String, :desc => "Definition description"
  end
  def create
    attrs = params[:content_view_definition]
    definition = ContentViewDefinition.create!(attrs) do |cvd|
      cvd.organization = @organization
    end
    render :json => definition.to_json
  end

  api :PUT, "/organizations/:org/content_view_definitions/:id", "Update a definition"
  param :id, :number, :desc => "Definition identifer", :required => true
  param :org, String, :desc => "Organization name", :required => true
  param :content_view_definition, Hash do
    param :name, String, :desc => "Content view definition name"
    param :description, String, :desc => "Definition description"
  end
  def update
    @definition.update_attributes!(params[:content_view_definition])
    render :json => @definition.to_json
  end

  api :GET, "/content_view_definitions/:id", "Show definition info"
  param :id, :number, :desc => "Definition identifier", :required => true
  def show
    render :json => @definition.to_json
  end

  api :POST, "/organizations/:name/content_view_definitions/:id/publish",
    "Publish a content view"
  param :name, String, :desc => "Name for the new content view", :required=>true
  param :label, String, :desc=>"Label for the new content view", :required=>false
  param :description, String, :desc=>"Description for the new content view", :required=>false
  param :id, :identifier, :desc => "Definition identifier", :required => true
  def publish
    content_view = @definition.publish(params[:name], params[:description], params[:label])
    render :json => content_view
  end

  api :DELETE, "/content_view_definitions/:id", "Delete a cv definition"
  param :id, :identifier, :desc => "Definition identifier", :required => true
  def destroy
    @definition.destroy
    render :json => @definition
  end

  api :GET, "/content_view_definitions/:id/content_views",
    "List a definition's content views"
  param :id, :identifier, :desc => "Definition identifier", :required => true
  def content_views
    render :json => @definition.component_content_views
  end

  api :PUT, "/content_view_definitions/:id/content_views",
    "Update a definition's content views"
  param :id, :identifier, :desc => "Definition identifier", :required => true
  param :views, Array, :desc => "Updated list of view ids", :required => true
  def update_content_views
    org_id = @definition.organization.id
    @content_views = ContentView.where(:id => params[:views])
    deleted_content_views = @definition.component_content_views - @content_views
    added_content_views = @content_views - @definition.component_content_views

    @definition.component_content_views -= deleted_content_views
    @definition.component_content_views += added_content_views
    @definition.save!

    render :json => @definition.component_content_views
  end

  private

    def find_definition
      @definition = ContentViewDefinition.find(params[:id])
    end

end
