# Stuff for view/display/frontend
group :assets do
  gem 'haml', '>= 3.1.2'
  gem 'haml-rails', "= 0.3.4"
  gem 'compass', '>= 0.11.5'
  if Gem.loaded_specs["compass"].version.to_s > "0.12.0"
    gem 'compass-rails', '~> 1.0.3'
  end
  gem 'compass-960-plugin', '>= 0.10.4', :require => 'ninesixty'
  gem 'simple-navigation', '>= 3.3.4'
end
